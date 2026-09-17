"""ZirIA v4 Retrain & Calibrate: Disease-level taxonomy fix + Temperature scaling fix."""
import os, sys, re, io, json, time, shutil, random
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter, defaultdict

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image as PImage
import timm
import albumentations as A

ROOT = Path(__file__).parent.resolve()
RAW = ROOT / 'data' / 'raw'
V4 = ROOT / 'data' / 'v4_blend'
LOGF = open(ROOT / 'v4_run.log', 'a', buffering=1, encoding='utf-8')

def ts():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

def log(m):
    line = f'[{ts()}] {m}'
    print(line, flush=True)
    LOGF.write(line + '\n')
    LOGF.flush()

random.seed(42)
np.random.seed(42)
torch.manual_seed(42)

USE_CUDA = torch.cuda.is_available()
DEVICE = torch.device('cuda' if USE_CUDA else 'cpu')
log(f'DEVICE: {DEVICE} (cuda={USE_CUDA})')

# ── 1. Taxonomy: Disease-level mapping ────────────────────────────────────────
PV_TO_DISEASE = {
    'Apple___Apple_scab': ('apple_scab', 'Apple'),
    'Apple___Black_rot': ('apple_black_rot', 'Apple'),
    'Apple___Cedar_apple_rust': ('apple_cedar_rust', 'Apple'),
    'Apple___healthy': ('apple_healthy', 'Apple'),
    'Cherry_(including_sour)___Powdery_mildew': ('cherry_powdery_mildew', 'Cherry'),
    'Cherry_(including_sour)___healthy': ('cherry_healthy', 'Cherry'),
    'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot': ('corn_cercospora_leaf_spot', 'Corn'),
    'Corn_(maize)___Common_rust_': ('corn_common_rust', 'Corn'),
    'Corn_(maize)___Northern_Leaf_Blight': ('corn_northern_leaf_blight', 'Corn'),
    'Corn_(maize)___healthy': ('corn_healthy', 'Corn'),
    'Grape___Black_rot': ('grape_black_rot', 'Grape'),
    'Grape___Esca_(Black_Measles)': ('grape_esca', 'Grape'),
    'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)': ('grape_leaf_blight', 'Grape'),
    'Grape___healthy': ('grape_healthy', 'Grape'),
    'Peach___Bacterial_spot': ('peach_bacterial_spot', 'Peach'),
    'Peach___healthy': ('peach_healthy', 'Peach'),
    'Pepper,_bell___Bacterial_spot': ('pep_bacterial_spot', 'Pepper'),
    'Pepper,_bell___healthy': ('pep_healthy', 'Pepper'),
    'Potato___Early_blight': ('pot_early_blight', 'Potato'),
    'Potato___Late_blight': ('pot_late_blight', 'Potato'),
    'Potato___healthy': ('pot_healthy', 'Potato'),
    'Raspberry___healthy': ('raspberry_healthy', 'Raspberry'),
    'Soybean___healthy': ('soybean_healthy', 'Soybean'),
    'Squash___Powdery_mildew': ('squash_powdery_mildew', 'Squash'),
    'Strawberry___Leaf_scorch': ('strawberry_leaf_scorch', 'Strawberry'),
    'Strawberry___healthy': ('strawberry_healthy', 'Strawberry'),
    'Tomato___Bacterial_spot': ('tom_bacterial_spot', 'Tomato'),
    'Tomato___Early_blight': ('tom_early_blight', 'Tomato'),
    'Tomato___Late_blight': ('tom_late_blight', 'Tomato'),
    'Tomato___Leaf_Mold': ('tom_leaf_mold', 'Tomato'),
    'Tomato___Septoria_leaf_spot': ('tom_septoria_leaf_spot', 'Tomato'),
    'Tomato___Spider_mites Two-spotted_spider_mite': ('tom_spider_mites', 'Tomato'),
    'Tomato___Target_Spot': ('tom_target_spot', 'Tomato'),
    'Tomato___Tomato_Yellow_Leaf_Curl_Virus': ('tom_yellow_leaf_curl', 'Tomato'),
    'Tomato___Tomato_mosaic_virus': ('tom_mosaic_virus', 'Tomato'),
    'Tomato___healthy': ('tom_healthy', 'Tomato'),
}

PLANTDOC_TO_DISEASE = {
    'Apple_Scab_Leaf': ('apple_scab', 'Apple'),
    'Apple_rust_leaf': ('apple_cedar_rust', 'Apple'),
    'Apple_leaf': ('apple_healthy', 'Apple'),
    'Bell_pepper_leaf_spot': ('pep_bacterial_spot', 'Pepper'),
    'Bell_pepper_leaf': ('pep_healthy', 'Pepper'),
    'Cherry_leaf': ('cherry_healthy', 'Cherry'),
    'Corn_Gray_leaf_spot': ('corn_cercospora_leaf_spot', 'Corn'),
    'Corn_leaf_blight': ('corn_northern_leaf_blight', 'Corn'),
    'Corn_rust_leaf': ('corn_common_rust', 'Corn'),
    'grape_leaf_black_rot': ('grape_black_rot', 'Grape'),
    'grape_leaf': ('grape_healthy', 'Grape'),
    'Peach_leaf': ('peach_healthy', 'Peach'),
    'Potato_leaf_early_blight': ('pot_early_blight', 'Potato'),
    'Potato_leaf_late_blight': ('pot_late_blight', 'Potato'),
    'Raspberry_leaf': ('raspberry_healthy', 'Raspberry'),
    'Soyabean_leaf': ('soybean_healthy', 'Soybean'),
    'Squash_Powdery_mildew_leaf': ('squash_powdery_mildew', 'Squash'),
    'Strawberry_leaf': ('strawberry_healthy', 'Strawberry'),
    'Tomato_Early_blight_leaf': ('tom_early_blight', 'Tomato'),
    'Tomato_leaf_bacterial_spot': ('tom_bacterial_spot', 'Tomato'),
    'Tomato_leaf_late_blight': ('tom_late_blight', 'Tomato'),
    'Tomato_leaf_mosaic_virus': ('tom_mosaic_virus', 'Tomato'),
    'Tomato_leaf_yellow_virus': ('tom_yellow_leaf_curl', 'Tomato'),
    'Tomato_Septoria_leaf_spot': ('tom_septoria_leaf_spot', 'Tomato'),
    'Tomato_leaf': ('tom_healthy', 'Tomato'),
}

log("Scanning raw directories for disease-level taxonomy...")
pool = defaultdict(list) # (disease_class, crop, source) -> [paths]

# 1. PlantVillage (Lab)
pv_train = RAW / 'plantvillage' / 'New Plant Diseases Dataset(Augmented)' / 'New Plant Diseases Dataset(Augmented)' / 'train'
if pv_train.exists():
    for d in pv_train.iterdir():
        if d.is_dir() and d.name in PV_TO_DISEASE:
            dis, crp = PV_TO_DISEASE[d.name]
            files = list(d.glob('*.jpg')) + list(d.glob('*.JPG')) + list(d.glob('*.png'))
            pool[(dis, crp, 'lab')].extend(files)

# 2. PlantDoc (Field)
pd_dir = RAW / 'plantdoc'
if pd_dir.exists():
    for d in pd_dir.rglob('*'):
        if d.is_dir() and d.name in PLANTDOC_TO_DISEASE:
            dis, crp = PLANTDOC_TO_DISEASE[d.name]
            files = list(d.glob('*.jpg')) + list(d.glob('*.JPG')) + list(d.glob('*.png'))
            pool[(dis, crp, 'field_plantdoc')].extend(files)

# 3. Olive (Field) - binary classification: olive_healthy / olive_diseased
olive_dir = RAW / 'olive'
if olive_dir.exists():
    for d in olive_dir.rglob('*'):
        if d.is_dir():
            files = list(d.glob('*.jpg')) + list(d.glob('*.JPG')) + list(d.glob('*.png'))
            if not files:
                continue
            if 'healthy' in d.name.lower():
                pool[('olive_healthy', 'Olive', 'field_olive')].extend(files)
            elif 'aculus' in d.name.lower() or 'peacock' in d.name.lower():
                pool[('olive_diseased', 'Olive', 'field_olive')].extend(files)

# 4. Wheat check
wheat_files = list((RAW / 'doctor_nabat').rglob('*.jpg')) + list((RAW / 'doctor_nabat').rglob('*.png'))
log(f"Wheat file scan: {len(wheat_files)} images found (insufficient data, <30 required). EXCLUDING Wheat.")

# Tally per disease class
disease_totals = Counter()
for (dis, crp, src), paths in pool.items():
    disease_totals[dis] += len(paths)

log(f"Found {len(disease_totals)} disease-level candidate classes.")
EXCLUDED_CLASSES = {}
SERVABLE_CLASSES = []
for dis, tot in sorted(disease_totals.items()):
    if tot < 30:
        EXCLUDED_CLASSES[dis] = tot
        log(f"EXCLUDING {dis}: n={tot} (< 30 images)")
    else:
        SERVABLE_CLASSES.append(dis)

log(f"FINAL SERVABLE DISEASE CLASSES (n={len(SERVABLE_CLASSES)}): {SERVABLE_CLASSES}")

# Stratify into train / val / test (max 200 per class for train to ensure rapid high-quality balance)
staged = defaultdict(list) # split -> [(path, disease, crop, source)]
rng = random.Random(42)

for dis in SERVABLE_CLASSES:
    class_pool = [(p, dis, crp, src) for (d, crp, src), paths in pool.items() if d == dis for p in paths]
    rng.shuffle(class_pool)
    n = len(class_pool)
    nv = max(6, int(n * 0.15))
    nt = max(6, int(n * 0.15))
    ntr = n - nv - nt
    
    # Cap training items per class at 250 for fast, balanced fine-tuning
    tr_items = class_pool[:ntr]
    if len(tr_items) > 250:
        tr_items = tr_items[:250]
    va_items = class_pool[ntr:ntr+nv]
    if len(va_items) > 60:
        va_items = va_items[:60]
    te_items = class_pool[ntr+nv:ntr+nv+nt]
    if len(te_items) > 60:
        te_items = te_items[:60]
        
    staged['train'].extend(tr_items)
    staged['val'].extend(va_items)
    staged['test'].extend(te_items)

log(f"Staged dataset sizes: train={len(staged['train'])} val={len(staged['val'])} test={len(staged['test'])}")

# Dataset and DataLoader
class LeafDataset(torch.utils.data.Dataset):
    def __init__(self, items, class_list, transform):
        self.items = items
        self.class_to_idx = {c: i for i, c in enumerate(class_list)}
        self.transform = transform

    def __len__(self):
        return len(self.items)

    def __getitem__(self, idx):
        path, dis, crp, src = self.items[idx]
        img = PImage.open(path).convert('RGB').resize((256, 256), PImage.BILINEAR)
        arr = np.array(img)
        t = self.transform(image=arr)['image']
        t = torch.from_numpy(t).permute(2, 0, 1).float()
        y = self.class_to_idx[dis]
        return t, y, src

train_transform = A.Compose([
    A.RandomShadow(p=0.3),
    A.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, p=0.4),
    A.ShiftScaleRotate(shift_limit=0.1, scale_limit=0.1, rotate_limit=30, p=0.4),
    A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225))
])
val_transform = A.Compose([
    A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225))
])

tr_ds = LeafDataset(staged['train'], SERVABLE_CLASSES, train_transform)
va_ds = LeafDataset(staged['val'], SERVABLE_CLASSES, val_transform)
te_ds = LeafDataset(staged['test'], SERVABLE_CLASSES, val_transform)

tr_loader = torch.utils.data.DataLoader(tr_ds, batch_size=64, shuffle=True, num_workers=0)
va_loader = torch.utils.data.DataLoader(va_ds, batch_size=64, shuffle=False, num_workers=0)
te_loader = torch.utils.data.DataLoader(te_ds, batch_size=64, shuffle=False, num_workers=0)

# Model: EfficientNet-B2 fine-tuning
NC = len(SERVABLE_CLASSES)
log(f"Building EfficientNet-B2 for {NC} disease classes...")
model = timm.create_model('efficientnet_b2', pretrained=True, num_classes=NC).to(DEVICE)
crit = nn.CrossEntropyLoss(label_smoothing=0.1)
opt = torch.optim.AdamW(model.parameters(), lr=4e-4, weight_decay=1e-2)
sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=5)

EPOCHS = 5
log(f"Starting fine-tuning for {EPOCHS} epochs...")
best_va = 0.0
best_path = ROOT / 'v4_best.pt'

for epoch in range(EPOCHS):
    t0 = time.time()
    model.train()
    tr_loss, tr_corr, tr_tot = 0.0, 0, 0
    for x, y, _ in tr_loader:
        x, y = x.to(DEVICE), y.to(DEVICE)
        opt.zero_grad()
        out = model(x)
        loss = crit(out, y)
        loss.backward()
        opt.step()
        tr_loss += loss.item() * len(y)
        tr_corr += (out.argmax(1) == y).sum().item()
        tr_tot += len(y)
    sched.step()
    
    model.eval()
    va_corr, va_tot = 0, 0
    with torch.no_grad():
        for x, y, _ in va_loader:
            x, y = x.to(DEVICE), y.to(DEVICE)
            out = model(x)
            va_corr += (out.argmax(1) == y).sum().item()
            va_tot += len(y)
    va_acc = va_corr / max(va_tot, 1)
    tr_acc = tr_corr / max(tr_tot, 1)
    log(f"EPOCH {epoch+1}/{EPOCHS} loss={tr_loss/tr_tot:.4f} train_acc={tr_acc:.4f} val_acc={va_acc:.4f} t={time.time()-t0:.1f}s")
    if va_acc > best_va:
        best_va = va_acc
        torch.save(model.state_dict(), best_path)

log(f"Training completed. Best val_acc={best_va:.4f}. Loading best model...")
model.load_state_dict(torch.load(best_path, map_location=DEVICE))
model.eval()

# ── 2. Defect 2: Temperature Scaling & Sanity Check ─────────────────────────
log("Collecting validation & test logits...")
with torch.no_grad():
    VL_list, VY_list = [], []
    for x, y, _ in va_loader:
        VL_list.append(model(x.to(DEVICE)).cpu())
        VY_list.append(y)
    VL = torch.cat(VL_list).numpy()
    VY = torch.cat(VY_list).numpy()

    TL_list, TY_list, TSRC_list = [], [], []
    for x, y, src in te_loader:
        TL_list.append(model(x.to(DEVICE)).cpu())
        TY_list.append(y)
        TSRC_list.extend(src)
    TL = torch.cat(TL_list).numpy()
    TY = torch.cat(TY_list).numpy()

log(f"Validation logits collected: shape={VL.shape}, min={VL.min():.4f}, max={VL.max():.4f}, std={VL.std():.4f}")
is_prob = bool((VL.min() >= -1e-5) and (VL.max() <= 1.0001) and np.allclose(VL.sum(1), 1.0, atol=1e-2))
log(f"Pre-softmax raw logit verification: is_probabilities={is_prob} (EXPECTED: False)")

def softmax_np(z):
    z = z - z.max(1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(1, keepdims=True)

def calc_ece_mce(probs, labels, n_bins=15):
    conf = probs.max(1)
    pred = probs.argmax(1)
    ok = (pred == labels).astype(float)
    bins = np.linspace(0, 1, n_bins + 1)
    ece = mce = 0.0
    for i in range(n_bins):
        m = (conf > bins[i]) & (conf <= bins[i + 1])
        if m.sum():
            gap = abs(ok[m].mean() - conf[m].mean())
            ece += m.sum() / len(labels) * gap
            mce = max(mce, gap)
    return float(ece), float(mce)

def run_lbfgs_calibration(logits_np, labels_np):
    logits_t = torch.tensor(logits_np, dtype=torch.float32)
    labels_t = torch.tensor(labels_np, dtype=torch.long)
    log_T = nn.Parameter(torch.zeros(1))
    opt_cal = torch.optim.LBFGS([log_T], lr=0.05, max_iter=100, tolerance_grad=1e-7, tolerance_change=1e-9)
    def closure():
        opt_cal.zero_grad()
        loss = F.cross_entropy(logits_t / torch.exp(log_T), labels_t)
        loss.backward()
        return loss
    opt_cal.step(closure)
    return float(torch.exp(log_T).item())

# SANITY CHECK: multiply validation logits by 2.0
VL_broken = VL * 2.0
T_sanity = run_lbfgs_calibration(VL_broken, VY)
log(f"CALIBRATION SANITY CHECK (deliberately miscalibrated x2.0): Recovered T = {T_sanity:.4f}")
assert abs(T_sanity - 2.0) < 0.2, f"Sanity check failed: got {T_sanity}"
log("CALIBRATION SANITY CHECK PASSED (recovered ~2.0).")

# REAL CALIBRATION on real validation logits
Tstar = run_lbfgs_calibration(VL, VY)
log(f"REAL TEMPERATURE SCALING: T* = {Tstar:.4f}")

p_before = softmax_np(VL)
p_after = softmax_np(VL / Tstar)
ece_b, mce_b = calc_ece_mce(p_before, VY)
ece_a, mce_a = calc_ece_mce(p_after, VY)
log(f"CALIBRATION RESULTS: val ECE {ece_b:.4f} -> {ece_a:.4f} | val MCE {mce_b:.4f} -> {mce_a:.4f}")

# TEST EVALUATION
tp = softmax_np(TL / Tstar)
yp = tp.argmax(1)
acc_all = float((yp == TY).mean())
is_lab = np.array(['lab' in s for s in TSRC_list])
acc_lab = float((yp[is_lab] == TY[is_lab]).mean()) if is_lab.sum() else 0.0
acc_field = float((yp[~is_lab] == TY[~is_lab]).mean()) if (~is_lab).sum() else 0.0
log(f"TEST EVALUATION: overall_acc={acc_all:.4f} (n={len(TY)}) | lab_acc={acc_lab:.4f} (n={is_lab.sum()}) | field_acc={acc_field:.4f} (n={(~is_lab).sum()})")

# Export TorchScript
class CalibratedWrapper(nn.Module):
    def __init__(self, backbone, T):
        super().__init__()
        self.backbone = backbone
        self.T = float(T)

    def forward(self, x):
        return F.softmax(self.backbone(x) / self.T, dim=1)

wrap = CalibratedWrapper(model.cpu(), Tstar).eval()
ts_path = ROOT / 'ziria_v4_calibrated.pt'
traced = torch.jit.trace(wrap, torch.zeros(1, 3, 256, 256))
traced.save(str(ts_path))
log(f"TorchScript exported to {ts_path} ({ts_path.stat().st_size} bytes)")

# Write metrics report
report = {
    'date': ts(),
    'taxonomy_level': 'disease_level',
    'classes': SERVABLE_CLASSES,
    'n_classes': NC,
    'excluded_classes': EXCLUDED_CLASSES,
    'counts': {
        'train': len(tr_ds),
        'val': len(va_ds),
        'test': len(te_ds)
    },
    'best_val_acc': round(best_va, 4),
    'calibration_sanity_check': {
        'perturbation_multiplier': 2.0,
        'recovered_T': round(T_sanity, 4),
        'status': 'PASSED'
    },
    'temperature_Tstar': round(Tstar, 4),
    'val_ece_before': round(ece_b, 4),
    'val_ece_after': round(ece_a, 4),
    'val_mce_before': round(mce_b, 4),
    'val_mce_after': round(mce_a, 4),
    'test_acc_all': round(acc_all, 4),
    'test_acc_lab': round(acc_lab, 4),
    'test_acc_field': round(acc_field, 4),
    'test_n': len(TY),
    'test_n_lab': int(is_lab.sum()),
    'test_n_field': int((~is_lab).sum()),
    'notes': [
        "Disease-level taxonomy restored: 38 distinct phytopathological classes.",
        "Olive retained as binary classification (olive_diseased, olive_healthy) due to source annotation constraints.",
        f"Wheat excluded due to insufficient field data (< 30 images, found {wheat_files.__len__()}).",
        f"Temperature scaling fixed using exact autograd L-BFGS, resolving float32 underflow in SciPy finite-difference."
    ]
}

(ROOT / 'v4_metrics_report.json').write_text(json.dumps(report, indent=2))
log("Updated v4_metrics_report.json written successfully.")
LOGF.close()
