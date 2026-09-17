"""V5 Phase 3: fine-tune forward from v4_best.pt (38) to 53 classes. Logs to v5_run.log."""
import json, math, os, random, time
from pathlib import Path
from datetime import datetime, timezone
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import timm
from torchvision import transforms as T

random.seed(42)
np.random.seed(42)
torch.manual_seed(42)
torch.set_num_threads(8)

ROOT = Path(__file__).parent.resolve()
os.chdir(ROOT)
LOGF = open(ROOT / 'v5_run.log', 'a', buffering=1, encoding='utf-8')
T0 = time.time()
from phone_augment import PhoneCameraAugment

V4_38 = ['apple_black_rot', 'apple_cedar_rust', 'apple_healthy', 'apple_scab', 'cherry_healthy',
         'cherry_powdery_mildew', 'corn_cercospora_leaf_spot', 'corn_common_rust', 'corn_healthy',
         'corn_northern_leaf_blight', 'grape_black_rot', 'grape_esca', 'grape_healthy', 'grape_leaf_blight',
         'olive_diseased', 'olive_healthy', 'peach_bacterial_spot', 'peach_healthy', 'pep_bacterial_spot',
         'pep_healthy', 'pot_early_blight', 'pot_healthy', 'pot_late_blight', 'raspberry_healthy',
         'soybean_healthy', 'squash_powdery_mildew', 'strawberry_healthy', 'strawberry_leaf_scorch',
         'tom_bacterial_spot', 'tom_early_blight', 'tom_healthy', 'tom_late_blight', 'tom_leaf_mold',
         'tom_mosaic_virus', 'tom_septoria_leaf_spot', 'tom_spider_mites', 'tom_target_spot',
         'tom_yellow_leaf_curl']


def ts():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def log(m):
    line = f'[{ts()}] {m}'
    print(line, flush=True)
    LOGF.write(line + '\n')
    LOGF.flush()


CLASSES = json.loads((ROOT / 'dataset_manifest_v5.json').read_text())['final_classes']
NC = len(CLASSES)
OLD = [c for c in CLASSES if c in V4_38]
log(f'V5TRAIN classes={NC} old_retained={len(OLD)} new={NC-len(OLD)}')
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
log(f'V5TRAIN device={DEVICE} cuda={torch.cuda.is_available()}')
IMG, BATCH, MAXEP = 256, 48, 40

phone = PhoneCameraAugment(p=0.45, seed=42)
train_tf = T.Compose([T.Resize((IMG + 32, IMG + 32)), T.RandomCrop(IMG), T.RandomHorizontalFlip(0.5),
                      T.ColorJitter(0.3, 0.3, 0.3, 0.05), T.RandomRotation(20),
                      T.Lambda(lambda im: phone(im)), T.ToTensor(),
                      T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
                      T.RandomErasing(0.25, scale=(0.02, 0.15))])
eval_tf = T.Compose([T.Resize((IMG, IMG)), T.ToTensor(),
                     T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])])
from torchvision import datasets as tvds
from torch.utils.data import DataLoader, WeightedRandomSampler
tr_ds = tvds.ImageFolder(str(ROOT / 'data' / 'v5' / 'train'), transform=train_tf)
va_ds = tvds.ImageFolder(str(ROOT / 'data' / 'v5' / 'val'), transform=eval_tf)
te_ds = tvds.ImageFolder(str(ROOT / 'data' / 'v5' / 'test'), transform=eval_tf)
folder2idx = {c: i for i, c in enumerate(tr_ds.classes)}
remap = {folder2idx[c]: CLASSES.index(c) for c in tr_ds.classes if c in CLASSES}
log(f'V5TRAIN sizes train={len(tr_ds)} val={len(va_ds)} test={len(te_ds)} matched={len(remap)}')

model = timm.create_model('efficientnet_b2', pretrained=False, num_classes=NC, drop_rate=0.25)
sd = torch.load(ROOT / 'v4_best.pt', map_location='cpu')
if isinstance(sd, dict) and 'classifier.weight' not in sd and any('model' in k for k in sd.keys()):
    sd = sd.get('model', sd)
own = model.state_dict()
loaded = 0
for k, v in sd.items():
    if k in own and own[k].shape == v.shape:
        own[k] = v
        loaded += 1
model.load_state_dict(own)
log(f'V5TRAIN forward-loaded {loaded} tensors from v4_best.pt (head re-init for {NC})')
model = model.to(DEVICE)

cnt = np.zeros(NC)
for _, lb in tr_ds.samples:
    if lb in remap:
        cnt[remap[lb]] += 1
alpha = 1.0 / np.sqrt(np.maximum(cnt, 1))
alpha = alpha / alpha.sum() * NC
ALPHA = torch.tensor(alpha, dtype=torch.float32)


class FocalLoss(nn.Module):
    def __init__(self, alpha, gamma=2.0):
        super().__init__()
        self.register_buffer('alpha', alpha)
        self.gamma = gamma

    def forward(self, logits, targets):
        ce = F.cross_entropy(logits, targets, reduction='none')
        pt = torch.exp(-ce)
        return ((self.alpha[targets]) * ((1 - pt) ** self.gamma) * ce).mean()


def remap_labels(y):
    out = torch.empty_like(y)
    mask = torch.zeros(len(y), dtype=torch.bool)
    for old, new in remap.items():
        m = (y == old)
        out[m] = new
        mask |= m
    return out, mask


def macro_f1(yt, yp, nc):
    f = []
    for c in range(nc):
        tp = int(((yp == c) & (yt == c)).sum())
        fp = int(((yp == c) & (yt != c)).sum())
        fn = int(((yp != c) & (yt == c)).sum())
        p = tp / (tp + fp) if tp + fp else 0.0
        r = tp / (tp + fn) if tp + fn else 0.0
        f.append(2 * p * r / (p + r) if p + r else 0.0)
    return float(np.mean(f))


OLD_IDX = [CLASSES.index(c) for c in OLD]
crit = FocalLoss(ALPHA.to(DEVICE), 2.0)
opt = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=MAXEP)
scaler = torch.amp.GradScaler('cuda') if torch.cuda.is_available() else None
w = 1.0 / np.maximum(cnt, 1)
sw = [float(w[remap[lb]]) if lb in remap else 0.0 for _, lb in tr_ds.samples]
tl = DataLoader(tr_ds, batch_size=BATCH, sampler=WeightedRandomSampler(sw, len(sw), replacement=True), num_workers=0)
vl = DataLoader(va_ds, batch_size=BATCH, shuffle=False, num_workers=0)
CKPT, BEST = ROOT / 'v5_ckpt.pt', ROOT / 'v5_best.pt'
start_e, best_f1 = 0, -1.0
if CKPT.exists():
    try:
        ck = torch.load(CKPT, map_location=DEVICE)
        model.load_state_dict(ck['model'])
        opt.load_state_dict(ck['opt'])
        sched.load_state_dict(ck['sched'])
        start_e, best_f1 = ck['epoch'], ck.get('best_f1', -1.0)
        log(f'V5TRAIN resume epoch={start_e} best_f1={best_f1:.4f}')
    except Exception as e:
        log(f'V5TRAIN resume fail: {e}')
bad_ep = 0
for e in range(start_e, MAXEP):
    t0e = time.time()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    model.train()
    tl_avg, tc, tt, bad = 0.0, 0, 0, 0
    for imgs, lbs in tl:
        try:
            lbs, m = remap_labels(lbs)
            imgs, lbs = imgs[m].to(DEVICE), lbs[m].to(DEVICE)
            if len(imgs) == 0:
                continue
            opt.zero_grad()
            if scaler:
                with torch.amp.autocast('cuda'):
                    out = model(imgs)
                    loss = crit(out, lbs)
                scaler.scale(loss).backward()
                scaler.unscale_(opt)
                nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                scaler.step(opt)
                scaler.update()
            else:
                out = model(imgs)
                loss = crit(out, lbs)
                loss.backward()
                opt.step()
            tl_avg += loss.item() * len(lbs)
            tc += (out.argmax(1) == lbs).sum().item()
            tt += len(lbs)
        except Exception:
            bad += 1
            continue
    sched.step()
    model.eval()
    yp_, yt_ = [], []
    with torch.no_grad():
        for imgs, lbs in vl:
            lbs, m = remap_labels(lbs)
            imgs, lbs = imgs[m].to(DEVICE), lbs[m].to(DEVICE)
            if len(imgs) == 0:
                continue
            o = model(imgs)
            yp_.append(o.argmax(1).cpu().numpy())
            yt_.append(lbs.cpu().numpy())
    yp_ = np.concatenate(yp_)
    yt_ = np.concatenate(yt_)
    f1 = macro_f1(yt_, yp_, NC)
    mo = np.isin(yt_, OLD_IDX)
    f1_old = macro_f1(yt_[mo], yp_[mo], NC) if mo.sum() else -1.0
    va = float((yp_ == yt_).mean())
    log(f'EPOCH v5 e{e+1}/{MAXEP} loss={tl_avg/max(tt,1):.4f} train={tc/max(tt,1):.4f} val={va:.4f} macroF1={f1:.4f} old34_F1={f1_old:.4f} bad={bad} lr={sched.get_last_lr()[0]:.6f} t={time.time()-t0e:.0f}s')
    torch.save({'model': model.state_dict(), 'opt': opt.state_dict(), 'sched': sched.state_dict(),
                'epoch': e + 1, 'best_f1': best_f1}, CKPT)
    if f1 > best_f1:
        best_f1, bad_ep = f1, 0
        torch.save(model.state_dict(), BEST)
        log(f'EPOCH v5 new best macroF1={f1:.4f}')
    else:
        bad_ep += 1
        if bad_ep >= 8:
            log(f'EPOCH v5 early stop at e{e+1} best={best_f1:.4f}')
            break
log(f'V5TRAIN done best_macroF1={best_f1:.4f} total_h={(time.time()-T0)/3600:.2f}')
LOGF.close()
