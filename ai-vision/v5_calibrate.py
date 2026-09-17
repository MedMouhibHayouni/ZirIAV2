"""V5 Phase 4: calibration with mandatory miscalibration sanity check. Logs to v5_run.log."""
import json, csv, math
from pathlib import Path
from datetime import datetime, timezone
import numpy as np
import torch
import torch.nn.functional as F
import timm
from torchvision import datasets as tvds, transforms as T
from PIL import Image as PImage

ROOT = Path(__file__).parent.resolve()
LOGF = open(ROOT / 'v5_run.log', 'a', buffering=1, encoding='utf-8')
MAN = json.loads((ROOT / 'dataset_manifest_v5.json').read_text())
CLASSES = MAN['final_classes']
NC = len(CLASSES)
CIDX = {c: i for i, c in enumerate(CLASSES)}
V4_38 = ['apple_black_rot', 'apple_cedar_rust', 'apple_healthy', 'apple_scab', 'cherry_healthy',
         'cherry_powdery_mildew', 'corn_cercospora_leaf_spot', 'corn_common_rust', 'corn_healthy',
         'corn_northern_leaf_blight', 'grape_black_rot', 'grape_esca', 'grape_healthy', 'grape_leaf_blight',
         'olive_diseased', 'olive_healthy', 'peach_bacterial_spot', 'peach_healthy', 'pep_bacterial_spot',
         'pep_healthy', 'pot_early_blight', 'pot_healthy', 'pot_late_blight', 'raspberry_healthy',
         'soybean_healthy', 'squash_powdery_mildew', 'strawberry_healthy', 'strawberry_leaf_scorch',
         'tom_bacterial_spot', 'tom_early_blight', 'tom_healthy', 'tom_late_blight', 'tom_leaf_mold',
         'tom_mosaic_virus', 'tom_septoria_leaf_spot', 'tom_spider_mites', 'tom_target_spot',
         'tom_yellow_leaf_curl']
OLD_SET = set(c for c in V4_38 if c in CIDX)
OLD_IDX = [CIDX[c] for c in OLD_SET]
NEW_IDX = [i for i, c in enumerate(CLASSES) if c not in OLD_SET]


def ts():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def log(m):
    line = f'[{ts()}] CALIB {m}'
    print(line, flush=True)
    LOGF.write(line + '\n')
    LOGF.flush()


DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
log(f'device={DEVICE} classes={NC} old={len(OLD_IDX)} new={len(NEW_IDX)}')
IMG = 256
eval_tf = T.Compose([T.Resize((IMG, IMG)), T.ToTensor(), T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])])
val_ds = tvds.ImageFolder(str(ROOT / 'data' / 'v5' / 'val'), transform=eval_tf)
test_ds = tvds.ImageFolder(str(ROOT / 'data' / 'v5' / 'test'), transform=eval_tf)
log(f'val={len(val_ds)} test={len(test_ds)} hard_dir={ROOT/"data"/"hard_set_v5"} exists={(ROOT/"data"/"hard_set_v5").exists()}')
remap = {i: CIDX[c] for i, c in enumerate(val_ds.classes) if c in CIDX}

model = timm.create_model('efficientnet_b2', pretrained=False, num_classes=NC, drop_rate=0.25)
model.load_state_dict(torch.load(ROOT / 'v5_best.pt', map_location='cpu'))
model = model.to(DEVICE).eval()
for p in model.parameters():
    p.requires_grad_(False)

def collect(ds):
    from torch.utils.data import DataLoader
    dl = DataLoader(ds, batch_size=48, shuffle=False, num_workers=0)
    Ls, Ys = [], []
    with torch.no_grad():
        for x, y in dl:
            y_mapped = torch.tensor([remap[int(v)] for v in y])
            out = model(x.to(DEVICE))
            Ls.append(out.cpu().double().numpy())
            Ys.append(y_mapped.numpy())
    return np.concatenate(Ls), np.concatenate(Ys)

VL, VY = collect(val_ds)
TL, TY = collect(test_ds)
log(f'logits val {VL.shape} test {TL.shape} val_range [{VL.min():.2f},{VL.max():.2f}]')

# hard set
HL, HY = None, None
try:
    hard = ROOT / 'data' / 'hard_set_v5'
    rows = list(csv.DictReader(open(hard / 'labels.csv', encoding='utf-8')))
    Hs, Ls = [], []
    for r in rows:
        p = hard / r['file']
        if not p.exists() or r['class'] not in CIDX:
            continue
        arr = np.array(PImage.open(p).convert('RGB').resize((IMG, IMG), PImage.BILINEAR))
        t = eval_tf(PImage.fromarray(arr)).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            out = model(t).cpu().double().numpy()[0]
        Hs.append(out)
        Ls.append(CIDX[r['class']])
    if Hs:
        HL, HY = np.array(Hs), np.array(Ls)
        log(f'hard logits {HL.shape} classes_present={len(set(HY))}')
    else:
        log('hard: 0 usable after class filter')
except Exception as e:
    log(f'hard collect FAIL {e}')

def softmax(z):
    z = z - z.max(1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(1, keepdims=True)

def ece_mce(probs, labels, n_bins=15):
    conf = probs.max(1)
    pred = probs.argmax(1)
    ok = (pred == labels).astype(float)
    bins = np.linspace(0, 1, n_bins + 1)
    ece = mce = 0.0
    for i in range(n_bins):
        m = (conf > bins[i]) & (conf <= bins[i+1])
        if m.sum():
            gap = abs(ok[m].mean() - conf[m].mean())
            ece += m.sum()/len(labels)*gap
            mce = max(mce, gap)
    return float(ece), float(mce)

def fit_T(logits, labels):
    # float64, logT param to keep T>0, L-BFGS-B with explicit epsilon to avoid finite-diff underflow
    from scipy.optimize import minimize
    def nll(logT):
        T = float(np.exp(logT[0]))
        p = softmax(logits / T)
        return float(-np.log(p[np.arange(len(labels)), labels] + 1e-12).mean())
    res = minimize(nll, x0=np.array([0.0], dtype=np.float64), method='L-BFGS-B',
                   options={'ftol':1e-12, 'gtol':1e-10, 'maxiter':200})
    return float(np.exp(res.x[0])), res

T_real, res_real = fit_T(VL, VY)
log(f'REAL T*={T_real:.4f} success={res_real.success} nll={res_real.fun:.4f} nit={res_real.nit}')

# sanity: miscalibrate by 2.0x
VL_miscal = VL * 2.0
T_miscal, res_miscal = fit_T(VL_miscal, VY)
ratio = T_miscal / max(T_real, 1e-9)
log(f'SANITY miscal x2.0 -> T_miscal={T_miscal:.4f} ratio={ratio:.4f} success={res_miscal.success}')
passed = res_miscal.success and 1.7 <= ratio <= 2.3 and 1.6 <= T_miscal <= 2.6
log(f'SANITY status={"PASSED" if passed else "FAILED"} (need ratio ~2.0 and T_miscal ~2x)')

if not passed:
    with open(ROOT / 'BLOCKED.md', 'a', encoding='utf-8') as f:
        f.write(f'- [{ts()}] CALIB sanity FAILED: T_real={T_real:.4f} T_miscal={T_miscal:.4f} ratio={ratio:.4f}\n')

def eval_split(name, logits, labels, T):
    p0 = softmax(logits)
    p1 = softmax(logits / T)
    acc = float((p1.argmax(1) == labels).mean())
    e0, m0 = ece_mce(p0, labels)
    e1, m1 = ece_mce(p1, labels)
    log(f'EVAL {name} n={len(labels)} acc={acc:.4f} ECE {e0:.4f}->{e1:.4f} MCE {m0:.4f}->{m1:.4f}')
    return {'n': len(labels), 'acc': round(acc,4), 'ece_before': round(e0,4), 'ece_after': round(e1,4),
            'mce_before': round(m0,4), 'mce_after': round(m1,4)}

full = eval_split('test_full', TL, TY, T_real)
mask_old = np.isin(TY, OLD_IDX)
mask_new = np.isin(TY, NEW_IDX)
old = eval_split('test_old34', TL[mask_old], TY[mask_old], T_real) if mask_old.sum() else {'n':0,'acc':'not measured'}
new = eval_split('test_new19', TL[mask_new], TY[mask_new], T_real) if mask_new.sum() else {'n':0,'acc':'not measured'}
hard_eval = eval_split('hard_set', HL, HY, T_real) if HL is not None else {'n':0,'acc':'not measured'}

# save calibration + wrapper
import torch.nn as nn
import torch.nn.functional as F

class CalWrapper(nn.Module):
    def __init__(self, backbone, T, classes):
        super().__init__()
        self.backbone = backbone
        self.T = float(T)
        self.classes = classes
    def forward(self, x):
        return F.softmax(self.backbone(x) / self.T, dim=1)

wrap = CalWrapper(model, T_real, CLASSES).eval().cpu()
traced = torch.jit.trace(wrap, torch.zeros(1,3,IMG,IMG))
traced.save(str(ROOT / 'ziria_v5_calibrated.pt'))
log(f'EXPORT ziria_v5_calibrated.pt bytes={(ROOT/"ziria_v5_calibrated.pt").stat().st_size} shape={list(traced(torch.zeros(1,3,IMG,IMG)).shape)}')
# verify reload
back = torch.jit.load(str(ROOT / 'ziria_v5_calibrated.pt'))
with torch.no_grad():
    pv = back(torch.zeros(1,3,IMG,IMG))
log(f'VERIFY reload out_shape={list(pv.shape)} max={float(pv.max()):.4f}')

report = {'Tstar': round(T_real,4), 'lbfgs_success': bool(res_real.success),
          'sanity': {'perturb':2.0, 'T_miscal': round(T_miscal,4), 'ratio': round(ratio,4),
                     'status':'PASSED' if passed else 'FAILED'},
          'full': full, 'old34': old, 'new19': new, 'hard': hard_eval,
          'val_n': len(VY), 'val_range': [float(VL.min()), float(VL.max())]}
(ROOT / 'v5_calibration.json').write_text(json.dumps(report, indent=2))
log('WROTE v5_calibration.json')
LOGF.close()
