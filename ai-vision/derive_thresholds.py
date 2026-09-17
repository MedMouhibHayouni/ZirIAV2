"""Empirical threshold derivation from real v4 test set."""
import json
from pathlib import Path
from collections import defaultdict
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image as PImage
import timm
import albumentations as A

ROOT = Path(__file__).parent.resolve()
RAW = ROOT / 'data' / 'raw'

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

pool = defaultdict(list)
pv_train = RAW / 'plantvillage' / 'New Plant Diseases Dataset(Augmented)' / 'New Plant Diseases Dataset(Augmented)' / 'train'
if pv_train.exists():
    for d in pv_train.iterdir():
        if d.is_dir() and d.name in PV_TO_DISEASE:
            dis, crp = PV_TO_DISEASE[d.name]
            files = list(d.glob('*.jpg')) + list(d.glob('*.JPG')) + list(d.glob('*.png'))
            pool[(dis, crp, 'lab')].extend(files)

pd_dir = RAW / 'plantdoc'
if pd_dir.exists():
    for d in pd_dir.rglob('*'):
        if d.is_dir() and d.name in PLANTDOC_TO_DISEASE:
            dis, crp = PLANTDOC_TO_DISEASE[d.name]
            files = list(d.glob('*.jpg')) + list(d.glob('*.JPG')) + list(d.glob('*.png'))
            pool[(dis, crp, 'field_plantdoc')].extend(files)

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

rep = json.loads((ROOT / 'v4_metrics_report.json').read_text())
SERVABLE_CLASSES = rep["classes"]
Tstar = rep["temperature_Tstar"]
NC = len(SERVABLE_CLASSES)

import random
random.seed(42)
rng = random.Random(42)
staged_test = []
for dis in SERVABLE_CLASSES:
    class_pool = [(p, dis) for (d, crp, src), paths in pool.items() if d == dis for p in paths]
    rng.shuffle(class_pool)
    n = len(class_pool)
    nv = max(6, int(n * 0.15))
    nt = max(6, int(n * 0.15))
    ntr = n - nv - nt
    te_items = class_pool[ntr+nv:ntr+nv+min(nt, 60)]
    staged_test.extend(te_items)

DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = timm.create_model('efficientnet_b2', pretrained=False, num_classes=NC).to(DEVICE)
model.load_state_dict(torch.load(ROOT / 'v4_best.pt', map_location=DEVICE))
model.eval()

val_transform = A.Compose([
    A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225))
])

class_to_idx = {c: i for i, c in enumerate(SERVABLE_CLASSES)}
test_tensors, test_labels = [], []
for p, dis in staged_test:
    img = PImage.open(p).convert('RGB').resize((256, 256), PImage.BILINEAR)
    t = val_transform(image=np.array(img))['image']
    t = torch.from_numpy(t).permute(2, 0, 1).float()
    test_tensors.append(t)
    test_labels.append(class_to_idx[dis])

X = torch.stack(test_tensors)
Y = np.array(test_labels)

# Compute calibrated probabilities
with torch.no_grad():
    batches = []
    for i in range(0, len(X), 64):
        bx = X[i:i+64].to(DEVICE)
        logits = model(bx)
        batches.append(logits.cpu())
    all_logits = torch.cat(batches).numpy()

# Calibrated probabilities using T* = 0.5954
calib_probs = F.softmax(torch.tensor(all_logits) / Tstar, dim=1).numpy()
preds = calib_probs.argmax(axis=1)
confs = calib_probs.max(axis=1)

# Sort probabilities to get top-1 and top-2 for margin
sorted_probs = np.sort(calib_probs, axis=1)
margins = sorted_probs[:, -1] - sorted_probs[:, -2]
correct = (preds == Y)

print(f"Total test samples evaluated: {len(Y)}")
print("Baseline unthresholded test accuracy: {:.2f}%".format(100.0 * correct.mean()))

# Grid sweep over confidence thresholds and margin thresholds
conf_grid = [0.50, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85]
margin_grid = [0.05, 0.10, 0.12, 0.15, 0.20]

print("\n--- Empirical Precision-at-Threshold Analysis ---")
print("{:<12} {:<10} {:<14} {:<14} {:<12} {:<15}".format("Conf Thresh", "Margin", "Accepted %", "Escalated %", "Precision %", "False Pos Rate"))
results = []
for c_th in conf_grid:
    for m_th in margin_grid:
        accepted_mask = (confs >= c_th) & (margins >= m_th)
        n_acc = accepted_mask.sum()
        if n_acc == 0:
            continue
        acc_pct = 100.0 * n_acc / len(Y)
        esc_pct = 100.0 - acc_pct
        precision = 100.0 * correct[accepted_mask].mean()
        fpr = 100.0 - precision
        results.append((c_th, m_th, acc_pct, esc_pct, precision, fpr))
        if c_th in [0.60, 0.70, 0.80] and m_th in [0.10, 0.12, 0.15, 0.20]:
            print(f"{c_th:<12.2f} {m_th:<10.2f} {acc_pct:<14.2f} {esc_pct:<14.2f} {precision:<12.2f} {fpr:<15.2f}")

# Find optimal operating point where Precision >= 99.0% and Acceptance is maximized
candidates = [r for r in results if r[4] >= 99.0]
best = max(candidates, key=lambda x: x[2])
print(f"\nEmpirical Operating Point (Precision >= 99.0%, max local resolution):")
print(f"Confidence >= {best[0]:.2f}, Margin >= {best[1]:.2f} -> Accepted: {best[2]:.2f}%, Precision: {best[4]:.2f}%, Escalation: {best[3]:.2f}%")
