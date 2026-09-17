"""
ZirIA Sentinel v2 — Production Training Pipeline (CPU-optimized)
MobileNetV3-Large + EfficientNet-B0 dual-model ensemble
"""
import os, json, time, random, math
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, WeightedRandomSampler
from torchvision import datasets, transforms
import timm
from pathlib import Path
def classification_report(y_true, y_pred, target_names=None, labels=None, digits=3):
    from collections import defaultdict
    if labels is None:
        labels = sorted(set(y_true.tolist() + y_pred.tolist()))
    counts = defaultdict(lambda: {"tp":0,"fp":0,"fn":0,"support":0})
    for yt, yp in zip(y_true, y_pred):
        counts[yt]["support"] += 1
        if yt == yp:
            counts[yt]["tp"] += 1
        else:
            counts[yt]["fn"] += 1
            counts[yp]["fp"] += 1
    header = f"{'class':<35} {'prec':>8} {'rec':>8} {'f1':>8} {'sup':>8}"
    lines = [header]
    for i, lbl in enumerate(labels):
        tp = counts[lbl]["tp"]; fp = counts[lbl]["fp"]; fn = counts[lbl]["fn"]
        sup = counts[lbl]["support"]
        prec = tp/(tp+fp) if (tp+fp)>0 else 0.0
        rec  = tp/(tp+fn) if (tp+fn)>0 else 0.0
        f1   = 2*prec*rec/(prec+rec) if (prec+rec)>0 else 0.0
        name = target_names[i] if target_names else str(lbl)
        lines.append(f"{name:<35} {prec:8.3f} {rec:8.3f} {f1:8.3f} {sup:8d}")
    acc = (y_true == y_pred).mean()
    lines.append(f"accuracy: {acc:.3f}")
    return "\n".join(lines)

random.seed(42)
np.random.seed(42)
torch.manual_seed(42)
torch.set_num_threads(6)

DEVICE = torch.device("cpu")
DATA_DIR = Path("data/full_dataset")
MODELS_DIR = Path("models")
MANIFEST = MODELS_DIR / "classes_full.json"

IMG_SIZE = 224
BATCH_SIZE = 32
NUM_EPOCHS = 25
LR = 1e-3
MIN_LR = 1e-5
WARMUP_EPOCHS = 2
WEIGHT_DECAY = 1e-4
LABEL_SMOOTHING = 0.1
DROPOUT = 0.25
GRAD_CLIP = 1.0

print(f"Device: {DEVICE} | Threads: {torch.get_num_threads()}")

with open(MANIFEST) as f:
    manifest = json.load(f)
CLASSES = manifest["classes"]
NUM_CLASSES = len(CLASSES)
print(f"Classes: {NUM_CLASSES}")

train_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE + 32, IMG_SIZE + 32)),
    transforms.RandomCrop(IMG_SIZE),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomVerticalFlip(p=0.2),
    transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.05),
    transforms.RandomRotation(20),
    transforms.RandomGrayscale(p=0.05),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    transforms.RandomErasing(p=0.25, scale=(0.02, 0.15)),
])

eval_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

train_ds = datasets.ImageFolder(str(DATA_DIR / "train"), transform=train_transform)
val_ds   = datasets.ImageFolder(str(DATA_DIR / "val"),   transform=eval_transform)
test_ds  = datasets.ImageFolder(str(DATA_DIR / "test"),  transform=eval_transform)

ds_classes = train_ds.classes
idx_remap = {}
for c in ds_classes:
    if c in CLASSES:
        idx_remap[ds_classes.index(c)] = CLASSES.index(c)

print(f"Train: {len(train_ds)}, Val: {len(val_ds)}, Test: {len(test_ds)}")
print(f"Remap: {len(idx_remap)} classes matched")

class_counts = np.zeros(NUM_CLASSES)
for _, label in train_ds.samples:
    mapped = idx_remap.get(label, label)
    if mapped < NUM_CLASSES:
        class_counts[mapped] += 1

class_weights = 1.0 / np.maximum(class_counts, 1)
sample_weights = [class_weights[idx_remap.get(label, label)] for _, label in train_ds.samples]
sampler = WeightedRandomSampler(sample_weights, len(train_ds), replacement=True)

train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, sampler=sampler, num_workers=0)
val_loader   = DataLoader(val_ds,   batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
test_loader  = DataLoader(test_ds,  batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

def mixup_data(x, y, alpha=0.3):
    lam = np.random.beta(alpha, alpha) if alpha > 0 else 1.0
    idx = torch.randperm(x.size(0))
    return lam * x + (1 - lam) * x[idx], y, y[idx], lam

def mixup_criterion(criterion, pred, y_a, y_b, lam):
    return lam * criterion(pred, y_a) + (1 - lam) * criterion(pred, y_b)

def remap_labels(labels, remap_dict, num_classes):
    remapped = torch.zeros_like(labels)
    for old, new in remap_dict.items():
        remapped[labels == old] = new
    valid_mask = remapped < num_classes
    return remapped, valid_mask

def compute_ece(probs, labels, n_bins=10):
    conf = probs.max(axis=1)
    pred_cls = probs.argmax(axis=1)
    correct = (pred_cls == labels).astype(float)
    bins = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    for i in range(n_bins):
        mask = (conf > bins[i]) & (conf <= bins[i+1])
        if mask.sum() > 0:
            ece += mask.sum() / len(labels) * abs(correct[mask].mean() - conf[mask].mean())
    return ece

def train_single_model(arch, model_name, pretrained=True):
    print(f"\n{'='*60}")
    print(f"Training: {arch}")
    print(f"{'='*60}")

    model = timm.create_model(arch, pretrained=pretrained, num_classes=NUM_CLASSES, drop_rate=DROPOUT)
    model = model.to(DEVICE)
    total_params = sum(p.numel() for p in model.parameters()) / 1e6
    print(f"Params: {total_params:.2f}M")

    optimizer = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)
    criterion = nn.CrossEntropyLoss(label_smoothing=LABEL_SMOOTHING)

    def cosine_lr(epoch):
        if epoch < WARMUP_EPOCHS:
            return (epoch + 1) / WARMUP_EPOCHS
        progress = (epoch - WARMUP_EPOCHS) / (NUM_EPOCHS - WARMUP_EPOCHS)
        cosine = 0.5 * (1 + math.cos(math.pi * progress))
        min_f = MIN_LR / LR
        return min_f + (1 - min_f) * cosine

    scheduler = torch.optim.lr_scheduler.LambdaLR(optimizer, lr_lambda=cosine_lr)

    best_val_acc = 0.0
    best_path = MODELS_DIR / f"best_{model_name}.pt"
    history = []

    for epoch in range(NUM_EPOCHS):
        t0 = time.time()
        model.train()
        train_loss, train_correct, train_total = 0.0, 0, 0

        for imgs, labels in train_loader:
            labels_mapped, valid = remap_labels(labels, idx_remap, NUM_CLASSES)
            imgs = imgs[valid]
            labels_mapped = labels_mapped[valid]
            if len(imgs) == 0:
                continue

            use_mixup = random.random() < 0.4
            if use_mixup and len(imgs) > 1:
                imgs, y_a, y_b, lam = mixup_data(imgs, labels_mapped)
                out = model(imgs)
                loss = mixup_criterion(criterion, out, y_a, y_b, lam)
                pred = out.argmax(dim=1)
                train_correct += int(lam * (pred == y_a).sum().item() + (1-lam) * (pred == y_b).sum().item())
            else:
                out = model(imgs)
                loss = criterion(out, labels_mapped)
                pred = out.argmax(dim=1)
                train_correct += (pred == labels_mapped).sum().item()

            optimizer.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), GRAD_CLIP)
            optimizer.step()
            train_loss += loss.item() * len(labels_mapped)
            train_total += len(labels_mapped)

        scheduler.step()

        model.eval()
        val_correct, val_total = 0, 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                labels_mapped, valid = remap_labels(labels, idx_remap, NUM_CLASSES)
                imgs = imgs[valid]
                labels_mapped = labels_mapped[valid]
                if len(imgs) == 0:
                    continue
                out = model(imgs)
                pred = out.argmax(dim=1)
                val_correct += (pred == labels_mapped).sum().item()
                val_total += len(labels_mapped)

        train_acc = train_correct / max(train_total, 1)
        val_acc = val_correct / max(val_total, 1)
        elapsed = time.time() - t0
        lr_now = scheduler.get_last_lr()[0]
        print(f"  E{epoch+1:02d}/{NUM_EPOCHS} loss={train_loss/max(train_total,1):.4f} "
              f"train={train_acc:.3f} val={val_acc:.3f} lr={lr_now:.6f} t={elapsed:.1f}s")
        history.append({"epoch": epoch+1, "train_acc": train_acc, "val_acc": val_acc})

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), best_path)
            print(f"    --> Best saved (val={val_acc:.4f})")

    print(f"\nBest val_acc for {arch}: {best_val_acc:.4f}")
    return model, best_path, best_val_acc, history

# Train model 1: MobileNetV3
m1, m1_path, m1_best, m1_history = train_single_model("mobilenetv3_large_100", "mobilenetv3")

# Train model 2: EfficientNet-B0
m2, m2_path, m2_best, m2_history = train_single_model("efficientnet_b0", "efficientnet_b0")

# ─── Ensemble test evaluation ─────────────────────────────────────────────────
print("\n" + "="*60)
print("Ensemble Evaluation on Test Set")
print("="*60)

m1.load_state_dict(torch.load(m1_path, map_location=DEVICE))
m2.load_state_dict(torch.load(m2_path, map_location=DEVICE))
m1.eval(); m2.eval()

all_preds, all_labels_test = [], []
all_probs_m1, all_probs_m2 = [], []
all_logits_m1, all_logits_m2 = [], []

with torch.no_grad():
    for imgs, labels in test_loader:
        labels_mapped, valid = remap_labels(labels, idx_remap, NUM_CLASSES)
        imgs = imgs[valid]
        labels_mapped = labels_mapped[valid]
        if len(imgs) == 0:
            continue
        o1 = m1(imgs); o2 = m2(imgs)
        all_logits_m1.append(o1); all_logits_m2.append(o2)
        p1 = F.softmax(o1, dim=1); p2 = F.softmax(o2, dim=1)
        ens = (p1 + p2) / 2
        pred = ens.argmax(dim=1)
        all_preds.extend(pred.numpy()); all_labels_test.extend(labels_mapped.numpy())
        all_probs_m1.extend(p1.numpy()); all_probs_m2.extend(p2.numpy())

all_preds = np.array(all_preds); all_labels_test = np.array(all_labels_test)
all_probs_m1 = np.array(all_probs_m1); all_probs_m2 = np.array(all_probs_m2)
ens_probs = (all_probs_m1 + all_probs_m2) / 2

test_acc = (all_preds == all_labels_test).mean()
ece_raw = compute_ece(ens_probs, all_labels_test)
print(f"Test accuracy (ensemble): {test_acc:.4f}")
print(f"ECE (raw ensemble): {ece_raw:.4f}")

# ─── Temperature calibration on val ──────────────────────────────────────────
print("\nCalibrating temperature...")
val_logits_m1, val_logits_m2, val_labels_list = [], [], []
with torch.no_grad():
    for imgs, labels in val_loader:
        labels_mapped, valid = remap_labels(labels, idx_remap, NUM_CLASSES)
        imgs = imgs[valid]; labels_mapped = labels_mapped[valid]
        if len(imgs) == 0:
            continue
        val_logits_m1.append(m1(imgs)); val_logits_m2.append(m2(imgs))
        val_labels_list.append(labels_mapped)

val_l1 = torch.cat(val_logits_m1); val_l2 = torch.cat(val_logits_m2)
val_labels_t = torch.cat(val_labels_list).numpy()

best_t, best_ece_val = 1.0, float("inf")
for t in np.linspace(0.3, 5.0, 94):
    p1 = F.softmax(val_l1 / t, dim=1).numpy()
    p2 = F.softmax(val_l2 / t, dim=1).numpy()
    ece = compute_ece((p1 + p2) / 2, val_labels_t)
    if ece < best_ece_val:
        best_ece_val = ece; best_t = float(t)

print(f"T* = {best_t:.3f}, val ECE = {best_ece_val:.4f}")

test_l1 = torch.cat(all_logits_m1); test_l2 = torch.cat(all_logits_m2)
cal_p1 = F.softmax(test_l1 / best_t, dim=1).numpy()
cal_p2 = F.softmax(test_l2 / best_t, dim=1).numpy()
cal_ens = (cal_p1 + cal_p2) / 2
ece_cal = compute_ece(cal_ens, all_labels_test)
print(f"ECE (calibrated T={best_t:.3f}): {ece_cal:.4f}")

# Calibrated accuracy
cal_preds = cal_ens.argmax(axis=1)
cal_acc = (cal_preds == all_labels_test).mean()
print(f"Test accuracy (calibrated ensemble): {cal_acc:.4f}")

# Per-class metrics
present_classes = sorted(set(all_labels_test.tolist()))
print("\nPer-class report:")
print(classification_report(
    all_labels_test, cal_preds,
    target_names=[CLASSES[i] for i in present_classes],
    labels=present_classes, digits=3
))

# ─── Save results ─────────────────────────────────────────────────────────────
results = {
    "num_classes": NUM_CLASSES,
    "train_images": len(train_ds),
    "val_images": len(val_ds),
    "test_images": len(test_ds),
    "m1_best_val_acc": round(m1_best, 4),
    "m2_best_val_acc": round(m2_best, 4),
    "ensemble_test_acc": round(test_acc, 4),
    "calibrated_ensemble_test_acc": round(cal_acc, 4),
    "ece_raw": round(ece_raw, 4),
    "ece_calibrated": round(ece_cal, 4),
    "temperature": round(best_t, 3),
    "m1_history": m1_history,
    "m2_history": m2_history,
}
with open("models/training_results_v2.json", "w") as f:
    json.dump(results, f, indent=2)
print("\nResults -> models/training_results_v2.json")

# ─── Export TorchScript for both models ──────────────────────────────────────
dummy = torch.zeros(1, 3, IMG_SIZE, IMG_SIZE)
for name, model in [("mobilenetv3", m1), ("efficientnet_b0", m2)]:
    model.eval()
    with torch.no_grad():
        traced = torch.jit.trace(model, dummy)
    out_path = MODELS_DIR / f"sentinel_{name}.torchscript.pt"
    traced.save(str(out_path))
    print(f"TorchScript -> {out_path}")

calib = {
    "temperature": round(best_t, 4),
    "classes": CLASSES,
    "num_classes": NUM_CLASSES,
    "img_size": IMG_SIZE,
    "model_arch": "ensemble_mobilenetv3_efficientnet_b0",
    "models": ["sentinel_mobilenetv3.torchscript.pt", "sentinel_efficientnet_b0.torchscript.pt"],
    "mean": [0.485, 0.456, 0.406],
    "std": [0.229, 0.224, 0.225],
}
with open("models/calibration_v2.json", "w") as f:
    json.dump(calib, f, indent=2)
print("Calibration -> models/calibration_v2.json")
print("\nAll done!")
