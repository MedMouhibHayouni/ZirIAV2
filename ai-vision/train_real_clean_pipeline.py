"""
ZirIA Sentinel ML Pipeline — Clean Real Biological Leaf Training & Calibration
Trains on 950 verified plant leaf images across 19 classes.
Computes real test accuracy, ECE before/after temperature scaling, margin distribution, and exports TorchScript.
"""

import os
import sys
import time
import json
import numpy as np
from PIL import Image

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
import torchvision.transforms as T
from torchvision.datasets import ImageFolder
import timm

DATA_DIR = "data/clean_leaves"
BATCH_SIZE = 16

train_transforms = T.Compose([
    T.RandomResizedCrop(224, scale=(0.8, 1.0)),
    T.RandomHorizontalFlip(),
    T.RandomRotation(15),
    T.ColorJitter(brightness=0.15, contrast=0.15),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

eval_transforms = T.Compose([
    T.Resize(256),
    T.CenterCrop(224),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

print("Loading Real Biological Leaf ImageFolder datasets...")
train_dataset = ImageFolder(os.path.join(DATA_DIR, "train"), transform=train_transforms)
val_dataset = ImageFolder(os.path.join(DATA_DIR, "val"), transform=eval_transforms)
test_dataset = ImageFolder(os.path.join(DATA_DIR, "test"), transform=eval_transforms)

classes = train_dataset.classes
num_classes = len(classes)
print(f"Loaded {len(train_dataset)} train, {len(val_dataset)} val, {len(test_dataset)} test samples across {num_classes} classes.")

train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=0)
val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

device = torch.device("cpu")

# ── 1. Train Model 1: EfficientNet-B0 ──────────────────────────────────────────
print("\n--- Training Model 1: EfficientNet-B0 (Pretrained ImageNet) ---")
model1 = timm.create_model("efficientnet_b0", pretrained=True, num_classes=num_classes)
model1.to(device)

criterion = nn.CrossEntropyLoss()

# Warmup head
print("Stage 1: Classifier head warmup (3 epochs)...")
for param in model1.parameters():
    param.requires_grad = False
for param in model1.get_classifier().parameters():
    param.requires_grad = True

opt1_head = torch.optim.AdamW(model1.get_classifier().parameters(), lr=1e-3, weight_decay=1e-4)

for epoch in range(3):
    model1.train()
    running_loss = 0.0
    correct = 0
    total = 0
    for imgs, labels in train_loader:
        opt1_head.zero_grad()
        out = model1(imgs)
        loss = criterion(out, labels)
        loss.backward()
        opt1_head.step()
        running_loss += loss.item() * imgs.size(0)
        correct += (out.argmax(1) == labels).sum().item()
        total += labels.size(0)
    print(f"  Head Epoch {epoch+1}/3 - Loss: {running_loss/total:.4f}, Train Acc: {correct/total*100:.2f}%")

# Fine-tuning backbone
print("Stage 2: Backbone Fine-Tuning (4 epochs)...")
for param in model1.parameters():
    param.requires_grad = True
opt1_ft = torch.optim.AdamW([
    {"params": [p for n, p in model1.named_parameters() if "classifier" not in n], "lr": 1e-4},
    {"params": model1.get_classifier().parameters(), "lr": 5e-4}
], weight_decay=1e-4)

for epoch in range(4):
    model1.train()
    running_loss = 0.0
    correct = 0
    total = 0
    for imgs, labels in train_loader:
        opt1_ft.zero_grad()
        out = model1(imgs)
        loss = criterion(out, labels)
        loss.backward()
        opt1_ft.step()
        running_loss += loss.item() * imgs.size(0)
        correct += (out.argmax(1) == labels).sum().item()
        total += labels.size(0)
    print(f"  FT Epoch {epoch+1}/4 - Loss: {running_loss/total:.4f}, Train Acc: {correct/total*100:.2f}%")

# ── 2. Train Model 2: MobileNetV2 ─────────────────────────────────────────────
print("\n--- Training Model 2: MobileNetV2 (Pretrained ImageNet) ---")
model2 = timm.create_model("mobilenetv2_100", pretrained=True, num_classes=num_classes)
model2.to(device)

opt2 = torch.optim.AdamW(model2.parameters(), lr=3e-4, weight_decay=1e-4)
for epoch in range(5):
    model2.train()
    running_loss = 0.0
    correct = 0
    total = 0
    for imgs, labels in train_loader:
        opt2.zero_grad()
        out = model2(imgs)
        loss = criterion(out, labels)
        loss.backward()
        opt2.step()
        running_loss += loss.item() * imgs.size(0)
        correct += (out.argmax(1) == labels).sum().item()
        total += labels.size(0)
    print(f"  Model 2 Epoch {epoch+1}/5 - Loss: {running_loss/total:.4f}, Train Acc: {correct/total*100:.2f}%")

# ── 3. Extract Validation & Test Logits ────────────────────────────────────────
model1.eval()
model2.eval()

def extract_logits(model, loader):
    logits, targets = [], []
    with torch.no_grad():
        for imgs, lbls in loader:
            logits.append(model(imgs))
            targets.append(lbls)
    return torch.cat(logits, dim=0), torch.cat(targets, dim=0)

val_logits1, val_y = extract_logits(model1, val_loader)
val_logits2, _ = extract_logits(model2, val_loader)

test_logits1, test_y = extract_logits(model1, test_loader)
test_logits2, _ = extract_logits(model2, test_loader)

# ── 4. Fit Temperature Scaling on Validation Set ──────────────────────────────
class TemperatureScaling(nn.Module):
    def __init__(self):
        super().__init__()
        self.temperature = nn.Parameter(torch.ones(1) * 1.5)
    def forward(self, logits):
        return logits / self.temperature

def optimize_temperature(logits, targets):
    t_mod = TemperatureScaling()
    opt = torch.optim.LBFGS([t_mod.temperature], lr=0.01, max_iter=100)
    def step_loss():
        opt.zero_grad()
        loss = criterion(t_mod(logits), targets)
        loss.backward()
        return loss
    opt.step(step_loss)
    return float(t_mod.temperature.item())

temp1 = optimize_temperature(val_logits1, val_y)
temp2 = optimize_temperature(val_logits2, val_y)
print(f"\nReal Optimal Temperature (EfficientNet-B0): {temp1:.3f}")
print(f"Real Optimal Temperature (MobileNetV2): {temp2:.3f}")

# ── 5. Compute ECE and Test Metrics ────────────────────────────────────────────
def compute_ece(probs, targets, n_bins=10):
    bin_bounds = np.linspace(0, 1, n_bins + 1)
    confs = np.max(probs, axis=1)
    preds = np.argmax(probs, axis=1)
    accs = (preds == targets)
    ece = 0.0
    bin_info = []
    for i in range(n_bins):
        b_low = bin_bounds[i]
        b_up = bin_bounds[i+1]
        mask = (confs > b_low) & (confs <= b_up)
        prop = np.mean(mask)
        if prop > 0:
            bin_acc = np.mean(accs[mask])
            bin_conf = np.mean(confs[mask])
            err = np.abs(bin_conf - bin_acc)
            ece += err * prop
            bin_info.append({
                "bin": f"{b_low:.1f}-{b_up:.1f}",
                "count": int(np.sum(mask)),
                "acc": round(float(bin_acc), 4),
                "conf": round(float(bin_conf), 4),
                "error": round(float(err), 4)
            })
    return round(float(ece), 4), bin_info

y_test_np = test_y.numpy()

# Raw Softmax probabilities
p1_raw = F.softmax(test_logits1, dim=1).numpy()
p1_calib = F.softmax(test_logits1 / temp1, dim=1).numpy()
p2_calib = F.softmax(test_logits2 / temp2, dim=1).numpy()

p_ens = (p1_calib + p2_calib) / 2.0
test_preds = np.argmax(p_ens, axis=1)
test_accuracy = float(np.mean(test_preds == y_test_np))

ece_raw, bins_raw = compute_ece(p1_raw, y_test_np)
ece_calib, bins_calib = compute_ece(p1_calib, y_test_np)
ece_ens, bins_ens = compute_ece(p_ens, y_test_np)

print(f"\n--- Real Empirical Test Results ---")
print(f"Ensemble Test Accuracy: {test_accuracy*100:.2f}% (N={len(y_test_np)})")
print(f"Raw Softmax ECE: {ece_raw:.4f}")
print(f"Calibrated Ensemble ECE: {ece_ens:.4f}")

# Prediction Margins
sorted_p = np.sort(p_ens, axis=1)
margins = sorted_p[:, -1] - sorted_p[:, -2]
median_margin = float(np.median(margins))
low_m_mask = (margins < 0.15)
acc_low_m = float(np.mean(test_preds[low_m_mask] == y_test_np[low_m_mask])) if np.any(low_m_mask) else 0.0
acc_high_m = float(np.mean(test_preds[~low_m_mask] == y_test_np[~low_m_mask])) if np.any(~low_m_mask) else 0.0

print(f"Median Margin: {median_margin:.4f}")
print(f"Accuracy with Margin < 0.15: {acc_low_m*100:.2f}%")
print(f"Accuracy with Margin >= 0.15: {acc_high_m*100:.2f}%")

# Confusion Matrix
cm = np.zeros((num_classes, num_classes), dtype=int)
for yt, yp in zip(y_test_np, test_preds):
    cm[yt, yp] += 1

class_metrics = []
for c in range(num_classes):
    tp = cm[c, c]
    fp = np.sum(cm[:, c]) - tp
    fn = np.sum(cm[c, :]) - tp
    prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0
    class_metrics.append({
        "class_id": c,
        "name": classes[c],
        "precision": round(prec, 3),
        "recall": round(rec, 3),
        "f1": round(f1, 3),
        "support": int(np.sum(cm[c, :]))
    })

confusable_pairs = []
for i in range(num_classes):
    for j in range(num_classes):
        if i != j and cm[i, j] >= 1:
            confusable_pairs.append({
                "true_class": classes[i],
                "pred_class": classes[j],
                "error_count": int(cm[i, j])
            })
confusable_pairs = sorted(confusable_pairs, key=lambda x: x["error_count"], reverse=True)

# ── 6. Export Real Production Model ───────────────────────────────────────────
class CleanCalibratedEnsemble(nn.Module):
    def __init__(self, m1, m2, t1, t2):
        super().__init__()
        self.m1 = m1
        self.m2 = m2
        self.t1 = t1
        self.t2 = t2
    def forward(self, x):
        feat = self.m1.forward_features(x)
        feat_pool = self.m1.forward_head(feat, pre_logits=True)
        l1 = self.m1.get_classifier()(feat_pool)
        l2 = self.m2(x)
        p1 = F.softmax(l1 / self.t1, dim=-1)
        p2 = F.softmax(l2 / self.t2, dim=-1)
        return (p1 + p2) / 2.0, feat_pool

export_mod = CleanCalibratedEnsemble(model1, model2, temp1, temp2)
export_mod.eval()

os.makedirs("models", exist_ok=True)
model_out = "models/model_v1_2026-09-10.pt"
dummy = torch.randn(1, 3, 224, 224)
with torch.no_grad():
    traced = torch.jit.trace(export_mod, dummy)
    traced.save(model_out)

with open("models/classes.json", "w", encoding="utf-8") as f:
    json.dump(classes, f, indent=2)

report_data = {
    "train_samples": len(train_dataset),
    "val_samples": len(val_dataset),
    "test_samples": len(test_dataset),
    "classes": classes,
    "temp1": round(temp1, 3),
    "temp2": round(temp2, 3),
    "test_accuracy": round(test_accuracy, 4),
    "ece_raw": ece_raw,
    "ece_ensemble": ece_ens,
    "bins_ensemble": bins_ens,
    "median_margin": round(median_margin, 4),
    "acc_low_margin": round(acc_low_m, 4),
    "acc_high_margin": round(acc_high_m, 4),
    "class_metrics": class_metrics,
    "confusable_pairs": confusable_pairs[:8]
}

with open("clean_run_metrics.json", "w", encoding="utf-8") as f:
    json.dump(report_data, f, indent=2)

print(f"\nSuccessfully exported model to {model_out} ({os.path.getsize(model_out)/(1024*1024):.2f} MB)")
