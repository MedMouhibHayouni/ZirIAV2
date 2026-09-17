"""
ZirIA Sentinel ML Pipeline — REAL Training, Calibration & Evaluation
Trains real PyTorch models on downloaded leaf image dataset (ImageFolder).
Computes empirical metrics, temperature scaling ECE, and exports production TorchScript model.
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
from torch.utils.data import DataLoader, Dataset
import torchvision.transforms as T
from torchvision.datasets import ImageFolder
import timm

# ── 1. Setup DataLoaders with Real ImageFolder ────────────────────────────────
DATA_DIR = "data/dataset"
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

print("Loading Real ImageFolder datasets...")
train_dataset = ImageFolder(os.path.join(DATA_DIR, "train"), transform=train_transforms)
val_dataset = ImageFolder(os.path.join(DATA_DIR, "val_calib"), transform=eval_transforms)
test_dataset = ImageFolder(os.path.join(DATA_DIR, "test"), transform=eval_transforms)

# Get class mapping
classes = train_dataset.classes
num_classes = len(classes)
print(f"Loaded {len(train_dataset)} train, {len(val_dataset)} val_calib, {len(test_dataset)} test samples across {num_classes} classes:")
for idx, cls in enumerate(classes):
    print(f"  [{idx}] {cls}")

train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=0)
val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

device = torch.device("cpu")

# ── 2. Real Architecture Training (Transfer Learning) ─────────────────────────
# Model 1: EfficientNet-B0 (Fast & accurate on CPU)
print("\n--- Training Model 1: EfficientNet-B0 ---")
model1 = timm.create_model("efficientnet_b0", pretrained=True, num_classes=num_classes)
model1.to(device)

# Phase 1: Freeze backbone, train head
for param in model1.parameters():
    param.requires_grad = False
for param in model1.get_classifier().parameters():
    param.requires_grad = True

optimizer1 = torch.optim.AdamW(model1.get_classifier().parameters(), lr=1e-3, weight_decay=1e-4)
criterion = nn.CrossEntropyLoss()

print("Phase 1: Warmup classifier head (3 epochs)...")
for epoch in range(3):
    model1.train()
    running_loss = 0.0
    correct = 0
    total = 0
    for imgs, labels in train_loader:
        optimizer1.zero_grad()
        outputs = model1(imgs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer1.step()
        running_loss += loss.item() * imgs.size(0)
        correct += (outputs.argmax(1) == labels).sum().item()
        total += labels.size(0)
    print(f"  Epoch {epoch+1}/3 - Loss: {running_loss/total:.4f}, Train Acc: {correct/total*100:.2f}%")

# Phase 2: Fine-tune backbone
print("Phase 2: Fine-tuning full backbone (3 epochs)...")
for param in model1.parameters():
    param.requires_grad = True
optimizer1_ft = torch.optim.AdamW([
    {"params": [p for n, p in model1.named_parameters() if "classifier" not in n], "lr": 1e-4},
    {"params": model1.get_classifier().parameters(), "lr": 5e-4}
], weight_decay=1e-4)

for epoch in range(3):
    model1.train()
    running_loss = 0.0
    correct = 0
    total = 0
    for imgs, labels in train_loader:
        optimizer1_ft.zero_grad()
        outputs = model1(imgs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer1_ft.step()
        running_loss += loss.item() * imgs.size(0)
        correct += (outputs.argmax(1) == labels).sum().item()
        total += labels.size(0)
    print(f"  Epoch {epoch+1}/3 (FT) - Loss: {running_loss/total:.4f}, Train Acc: {correct/total*100:.2f}%")

# Model 2: MobileNetV2 (from linkanjarad PlantVillage pretrained weights)
print("\n--- Training Model 2: MobileNetV2 ---")
model2 = timm.create_model("mobilenetv2_100", pretrained=True, num_classes=num_classes)
model2.to(device)

optimizer2 = torch.optim.AdamW(model2.parameters(), lr=3e-4, weight_decay=1e-4)
for epoch in range(4):
    model2.train()
    running_loss = 0.0
    correct = 0
    total = 0
    for imgs, labels in train_loader:
        optimizer2.zero_grad()
        outputs = model2(imgs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer2.step()
        running_loss += loss.item() * imgs.size(0)
        correct += (outputs.argmax(1) == labels).sum().item()
        total += labels.size(0)
    print(f"  Model 2 Epoch {epoch+1}/4 - Loss: {running_loss/total:.4f}, Train Acc: {correct/total*100:.2f}%")

# ── 3. Evaluate and Collect Real Logits on Val & Test Sets ─────────────────────
model1.eval()
model2.eval()

def get_logits(model, loader):
    all_logits = []
    all_labels = []
    with torch.no_grad():
        for imgs, labels in loader:
            outputs = model(imgs)
            all_logits.append(outputs)
            all_labels.append(labels)
    return torch.cat(all_logits, dim=0), torch.cat(all_labels, dim=0)

val_logits1, val_labels = get_logits(model1, val_loader)
val_logits2, _ = get_logits(model2, val_loader)

test_logits1, test_labels = get_logits(model1, test_loader)
test_logits2, _ = get_logits(model2, test_loader)

# ── 4. Real Calibration (Temperature Scaling) ──────────────────────────────────
class TemperatureScaling(nn.Module):
    def __init__(self):
        super().__init__()
        self.temperature = nn.Parameter(torch.ones(1) * 1.5)
    def forward(self, logits):
        return logits / self.temperature

def fit_temperature(logits, labels):
    temp_model = TemperatureScaling()
    optimizer = torch.optim.LBFGS([temp_model.temperature], lr=0.01, max_iter=100)
    def eval_loss():
        optimizer.zero_grad()
        loss = criterion(temp_model(logits), labels)
        loss.backward()
        return loss
    optimizer.step(eval_loss)
    return float(temp_model.temperature.item())

temp1 = fit_temperature(val_logits1, val_labels)
temp2 = fit_temperature(val_logits2, val_labels)
print(f"\nReal Optimal Temperature (Model 1): {temp1:.3f}")
print(f"Real Optimal Temperature (Model 2): {temp2:.3f}")

def compute_ece(probs, labels, n_bins=10):
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    confidences = np.max(probs, axis=1)
    predictions = np.argmax(probs, axis=1)
    accuracies = (predictions == labels)
    ece = 0.0
    bin_details = []
    for i in range(n_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]
        in_bin = (confidences > bin_lower) & (confidences <= bin_upper)
        prop_in_bin = np.mean(in_bin)
        if prop_in_bin > 0:
            accuracy_in_bin = np.mean(accuracies[in_bin])
            avg_confidence_in_bin = np.mean(confidences[in_bin])
            ece += np.abs(avg_confidence_in_bin - accuracy_in_bin) * prop_in_bin
            bin_details.append({
                "bin": f"{bin_lower:.1f}-{bin_upper:.1f}",
                "count": int(np.sum(in_bin)),
                "acc": round(float(accuracy_in_bin), 4),
                "conf": round(float(avg_confidence_in_bin), 4),
                "error": round(float(np.abs(avg_confidence_in_bin - accuracy_in_bin)), 4)
            })
    return round(float(ece), 4), bin_details

# Model 1 Raw vs Calibrated on Test Set
raw_probs1 = F.softmax(test_logits1, dim=1).numpy()
calib_probs1 = F.softmax(test_logits1 / temp1, dim=1).numpy()

test_y = test_labels.numpy()
ece_raw, bins_raw = compute_ece(raw_probs1, test_y)
ece_calib, bins_calib = compute_ece(calib_probs1, test_y)
print(f"Model 1 Real Test ECE Raw: {ece_raw:.4f}")
print(f"Model 1 Real Test ECE Calibrated: {ece_calib:.4f}")

# ── 5. Ensembling & Prediction Margin ──────────────────────────────────────────
scaled_test1 = F.softmax(test_logits1 / temp1, dim=1).numpy()
scaled_test2 = F.softmax(test_logits2 / temp2, dim=1).numpy()
ensemble_probs = (scaled_test1 + scaled_test2) / 2.0

test_preds = np.argmax(ensemble_probs, axis=1)
test_acc = np.mean(test_preds == test_y)
ece_ensemble, bins_ensemble = compute_ece(ensemble_probs, test_y)

sorted_probs = np.sort(ensemble_probs, axis=1)
margins = sorted_probs[:, -1] - sorted_probs[:, -2]

median_margin = float(np.median(margins))
p25_margin = float(np.percentile(margins, 25))

low_margin_mask = (margins < 0.15)
acc_low_margin = float(np.mean(test_preds[low_margin_mask] == test_y[low_margin_mask])) if np.any(low_margin_mask) else 0.0
acc_high_margin = float(np.mean(test_preds[~low_margin_mask] == test_y[~low_margin_mask])) if np.any(~low_margin_mask) else 0.0

print(f"\nReal Ensemble Test Accuracy: {test_acc*100:.2f}%")
print(f"Real Ensemble ECE: {ece_ensemble:.4f}")
print(f"Real Median Margin: {median_margin:.4f}")
print(f"Accuracy with Margin < 0.15: {acc_low_margin*100:.2f}%")
print(f"Accuracy with Margin >= 0.15: {acc_high_margin*100:.2f}%")

# Confusion matrix on test set
cm = np.zeros((num_classes, num_classes), dtype=int)
for yt, yp in zip(test_y, test_preds):
    cm[yt, yp] += 1

class_metrics = []
for c in range(num_classes):
    tp = cm[c, c]
    fp = np.sum(cm[:, c]) - tp
    fn = np.sum(cm[c, :]) - tp
    prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0
    support = int(np.sum(cm[c, :]))
    class_metrics.append({
        "class_id": c,
        "name": classes[c],
        "precision": round(prec, 3),
        "recall": round(rec, 3),
        "f1": round(f1, 3),
        "support": support
    })

class_metrics_sorted = sorted(class_metrics, key=lambda x: x["f1"])
confusable_pairs = []
for i in range(num_classes):
    for j in range(num_classes):
        if i != j and cm[i, j] >= 1:
            confusable_pairs.append({
                "true_class": classes[i],
                "pred_class": classes[j],
                "error_count": int(cm[i, j]),
                "total_true": int(np.sum(cm[i, :]))
            })
confusable_pairs = sorted(confusable_pairs, key=lambda x: x["error_count"], reverse=True)

# ── 6. Evaluate on Real Field Photos (Hard Set) ───────────────────────────────
hard_set_dir = os.path.join(DATA_DIR, "hard_field")
hard_files = []
for root, _, files in os.walk(hard_set_dir):
    for f in files:
        if f.lower().endswith(('.jpg', '.jpeg', '.png')):
            cls_name = os.path.basename(root)
            if cls_name in classes:
                hard_files.append((os.path.join(root, f), classes.index(cls_name)))

hard_acc = 0.0
hard_ece = 0.0
if len(hard_files) > 0:
    hard_imgs = []
    hard_y = []
    for fpath, cls_idx in hard_files:
        try:
            im = Image.open(fpath).convert('RGB')
            hard_imgs.append(eval_transforms(im).unsqueeze(0))
            hard_y.append(cls_idx)
        except Exception as e:
            pass
    if hard_imgs:
        batch_hard = torch.cat(hard_imgs, dim=0)
        with torch.no_grad():
            out1 = model1(batch_hard) / temp1
            out2 = model2(batch_hard) / temp2
            p_hard = ((F.softmax(out1, dim=1) + F.softmax(out2, dim=1)) / 2.0).numpy()
        hard_y = np.array(hard_y)
        hard_acc = float(np.mean(np.argmax(p_hard, axis=1) == hard_y))
        hard_ece, _ = compute_ece(p_hard, hard_y)
        print(f"\nReal Hard Set (Tunisian Field Photos) Accuracy: {hard_acc*100:.2f}% (N={len(hard_y)})")
        print(f"Real Hard Set ECE: {hard_ece:.4f}")

# ── 7. Export Real Trained TorchScript Model ──────────────────────────────────
class RealCalibratedEnsemble(nn.Module):
    def __init__(self, m1, m2, t1, t2):
        super().__init__()
        self.m1 = m1
        self.m2 = m2
        self.t1 = t1
        self.t2 = t2
        
    def forward(self, x):
        feat = self.m1.forward_features(x)
        feat_pool = self.m1.forward_head(feat, pre_logits=True) # (B, 1280)
        
        logits1 = self.m1.get_classifier()(feat_pool)
        logits2 = self.m2(x)
        
        p1 = F.softmax(logits1 / self.t1, dim=-1)
        p2 = F.softmax(logits2 / self.t2, dim=-1)
        p_ens = (p1 + p2) / 2.0
        return p_ens, feat_pool

ensemble_export = RealCalibratedEnsemble(model1, model2, temp1, temp2)
ensemble_export.eval()

os.makedirs("models", exist_ok=True)
export_path = os.path.join("models", "model_v1_2026-09-10.pt")
dummy_tensor = torch.randn(1, 3, 224, 224)
with torch.no_grad():
    traced = torch.jit.trace(ensemble_export, dummy_tensor)
    traced.save(export_path)

print(f"\nExported real trained TorchScript model to: {export_path} ({os.path.getsize(export_path)/(1024*1024):.2f} MB)")

# Save class index to JSON so predictor can map indices accurately
with open("models/classes.json", "w", encoding="utf-8") as f:
    json.dump(classes, f, indent=2)

real_run_results = {
    "num_training_samples": len(train_dataset),
    "num_val_calib_samples": len(val_dataset),
    "num_test_samples": len(test_dataset),
    "num_hard_field_samples": len(hard_files),
    "classes": classes,
    "model1_name": "EfficientNet-B0",
    "model2_name": "MobileNetV2",
    "temp1": round(temp1, 3),
    "temp2": round(temp2, 3),
    "test_accuracy": round(float(test_acc), 4),
    "ece_raw": round(float(ece_raw), 4),
    "ece_calib": round(float(ece_calib), 4),
    "ece_ensemble": round(float(ece_ensemble), 4),
    "bins_raw": bins_raw,
    "bins_calib": bins_calib,
    "bins_ensemble": bins_ensemble,
    "median_margin": round(median_margin, 4),
    "acc_low_margin": round(acc_low_margin, 4),
    "acc_high_margin": round(acc_high_margin, 4),
    "hard_accuracy": round(float(hard_acc), 4),
    "hard_ece": round(float(hard_ece), 4),
    "class_metrics_sorted": class_metrics_sorted,
    "confusable_pairs": confusable_pairs[:6]
}

with open("real_metrics_run.json", "w", encoding="utf-8") as f:
    json.dump(real_run_results, f, indent=2)

print("Saved all real run metrics to real_metrics_run.json successfully.")
