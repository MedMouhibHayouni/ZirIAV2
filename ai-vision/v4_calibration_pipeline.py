"""ZirIA v4 calibration pipeline: Kaggle/HF field+lab blend, albumentations
outdoor aug, EfficientNet-B2, L-BFGS-B temperature scaling, TorchScript export.
Run: python -u v4_calibration_pipeline.py (cwd = ai-vision).
Logs: v4_run.log (timestamped). All numbers trace to log lines; gaps -> notes.
"""
import os, sys, re, io, json, time, shutil, hashlib, random, subprocess
import urllib.request
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter, defaultdict

import numpy as np
random.seed(7)
np.random.seed(7)

ROOT = Path(__file__).parent.resolve()
os.chdir(ROOT)
RAW = ROOT / 'data' / 'raw'
V4 = ROOT / 'data' / 'v4_blend'
for d in (RAW, V4):
    d.mkdir(parents=True, exist_ok=True)
LOGF = open(ROOT / 'v4_run.log', 'a', buffering=1, encoding='utf-8')
T0 = time.time()
NOTES = []


def ts():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def log(m):
    line = f'[{ts()}] {m}'
    print(line, flush=True)
    LOGF.write(line + '\n')
    LOGF.flush()


def note(m):
    NOTES.append(f'[{ts()}] {m}')
    log('NOTE: ' + m)


def disk(tag):
    try:
        u = shutil.disk_usage(ROOT)
        log(f'DISK {tag}: free={u.free/1e9:.1f}G')
    except Exception as e:
        log(f'DISK {tag} err: {e}')


def run(cmd, timeout, tag, retries=2, env=None):
    for a in range(retries + 1):
        try:
            log(f'{tag} attempt={a}: {" ".join(cmd)[:140]}')
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout,
                               cwd=str(ROOT), env=env)
            tail = (r.stdout or '')[-400:] + (r.stderr or '')[-400:]
            log(f'{tag} attempt={a} rc={r.returncode} tail={tail[-300:]}')
            if r.returncode == 0:
                return True
        except Exception as e:
            log(f'{tag} attempt={a} EXC {type(e).__name__} {str(e)[:150]}')
        time.sleep(30)
    note(f'{tag} failed after {retries+1} attempts')
    return False


# ── 1. credentials ───────────────────────────────────────────────────────────
try:
    kj = json.loads(Path(os.path.expanduser('~/.kaggle/kaggle.json')).read_text())
    os.environ['KAGGLE_USERNAME'] = kj['username']
    os.environ['KAGGLE_KEY'] = kj['key']
    log('KAGGLE creds loaded from kaggle.json (username hidden from log)')
except Exception as e:
    note(f'kaggle.json unreadable: {e}')

# ── 2. retrieval ─────────────────────────────────────────────────────────────
disk('v4-start')
ENV = dict(os.environ)


def kaggle_resume(slug, dest_dir, tag, tries=150):
    """Resumable Kaggle dataset download (Basic auth + Range). Returns zip path or None."""
    import base64
    import zipfile
    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    zp = dest_dir / (slug.replace('/', '_') + '.zip')
    # resume-from-STEP-2: skip if a previous run already completed this dataset
    try:
        n_img = sum(1 for f in dest_dir.rglob('*') if f.is_file() and f.suffix.lower() in
                    ('.jpg', '.jpeg', '.png', '.webp', '.bmp') and f.stat().st_size > 2000)
    except Exception:
        n_img = 0
    if n_img > 100:
        log(f'{tag} SKIP (already complete from prior run: {n_img} images)')
        return zp if zp.exists() else True
    import urllib.error
    creds = base64.b64encode(f"{os.environ['KAGGLE_USERNAME']}:{os.environ['KAGGLE_KEY']}".encode()).decode()
    url = f'https://www.kaggle.com/api/v1/datasets/download/{slug}'
    part = zp.with_suffix('.zip.part')
    for a in range(tries):
        try:
            have = part.stat().st_size if part.exists() else 0
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0',
                                                       'Authorization': f'Basic {creds}'})
            if have:
                req.add_header('Range', f'bytes={have}-')
            with urllib.request.urlopen(req, timeout=90) as r:
                mode = 'ab' if (have and r.status != 200) else 'wb'
                if mode == 'wb':
                    have = 0
                with open(part, mode) as f:
                    n = have
                    while True:
                        ch = r.read(1 << 20)
                        if not ch:
                            break
                        f.write(ch)
                        n += len(ch)
            part.rename(zp)
            log(f'{tag} download DONE bytes={zp.stat().st_size}')
            with zipfile.ZipFile(zp) as z:
                z.extractall(dest_dir)
            log(f'{tag} unzipped into {dest_dir}')
            return zp
        except urllib.error.HTTPError as e:
            if e.code == 403:
                log(f'{tag} HTTP 403 (private/removed) — no retry, fallback immediately')
                return None
            have = part.stat().st_size if part.exists() else 0
            log(f'{tag} attempt={a} HTTPError {e.code} have={have/1e6:.0f}MB; retry 10s')
            time.sleep(10)
        except Exception as e:
            have = part.stat().st_size if part.exists() else 0
            log(f'{tag} attempt={a} {type(e).__name__} {str(e)[:100]} have={have/1e6:.0f}MB; retry 10s')
            time.sleep(10)
    note(f'{tag} resume-download failed after {tries} attempts')
    return None


ok_pv = kaggle_resume('vipoooool/NEW-PLANT-DISEASES-DATASET', RAW / 'plantvillage', 'KAGGLE_PV') is not None
if not ok_pv:
    ok_pv = run(['kaggle', 'datasets', 'download', '-d', 'vipoooool/NEW-PLANT-DISEASES-DATASET',
                 '-p', str(RAW / 'plantvillage'), '--unzip'], 5400, 'KAGGLE_PV_CLI', env=ENV)
OLIVE_MIRRORS = ['habibulbasher01644/olive-leaf-image-dataset', 'serhathoca/zeytin']
ok_olive = False
for _mslug in OLIVE_MIRRORS:
    if kaggle_resume(_mslug, RAW / 'olive', f'KAGGLE_OLIVE[{_mslug}]') is not None:
        ok_olive = True
        log(f'KAGGLE_OLIVE using mirror {_mslug}')
        break
    log(f'KAGGLE_OLIVE mirror {_mslug} failed, trying next')
if not ok_olive:
    note('all olive mirrors failed; olive weight drops to 0 (reported honestly)')
ok_pd = False
if not (RAW / 'plantdoc').exists():
    ok_pd = run(['git', 'clone', '--depth', '1', 'https://github.com/pratikkayal/PlantDoc-Dataset.git',
                 str(RAW / 'plantdoc')], 3600, 'GIT_PLANTDOC')
else:
    ok_pd = True
    log('GIT_PLANTDOC exists, reuse')
ok_dn = False
if not (RAW / 'doctor_nabat').exists():
    ok_dn = run(['git', 'clone', '--depth', '1', 'https://github.com/doctorxub/plant-doctor-android.git',
                 str(RAW / 'doctor_nabat')], 3600, 'GIT_DOCTORNABAT')
else:
    ok_dn = True
    log('GIT_DOCTORNABAT exists, reuse')


def du(d):
    try:
        return sum(f.stat().st_size for f in Path(d).rglob('*') if f.is_file()), \
            sum(1 for f in Path(d).rglob('*') if f.is_file())
    except Exception:
        return 0, 0


# PlantDoc git fallback: HuggingFace mirror (same upstream dataset) via resume fetch
if not (RAW / 'plantdoc').exists() or sum(1 for _ in (RAW / 'plantdoc').rglob('*')) < 100:
    import zipfile as _zf2
    _pdest = RAW / 'plantdoc' / 'PlantDoc.zip'
    _pdest.parent.mkdir(parents=True, exist_ok=True)
    _ppart = _pdest.with_suffix('.zip.part')
    _pok = False
    for _a in range(40):
        try:
            _have = _ppart.stat().st_size if _ppart.exists() else 0
            _req = urllib.request.Request('https://huggingface.co/datasets/LamTNguyen/PlantDoc/resolve/main/PlantDoc.zip',
                                          headers={'User-Agent': 'Mozilla/5.0'})
            if _have:
                _req.add_header('Range', f'bytes={_have}-')
            with urllib.request.urlopen(_req, timeout=90) as _r:
                _mode = 'ab' if (_have and _r.status != 200) else 'wb'
                with open(_ppart, _mode) as _f:
                    while True:
                        _ch = _r.read(1 << 20)
                        if not _ch:
                            break
                        _f.write(_ch)
            _ppart.rename(_pdest)
            _pok = True
            break
        except Exception as _e:
            log(f'HF_PLANTDOC attempt={_a} {type(_e).__name__} {str(_e)[:80]}; retry 10s')
            time.sleep(10)
    if _pok:
        try:
            with _zf2.ZipFile(_pdest) as _z:
                _z.extractall(RAW / 'plantdoc')
            log(f'HF_PLANTDOC unzipped bytes={_pdest.stat().st_size}')
            ok_pd = True
        except Exception as _e:
            note(f'PlantDoc zip extract failed: {_e}')
    else:
        note('PlantDoc HF mirror failed; field benchmark drops out (reported honestly)')
for tag, d in (('plantvillage', RAW / 'plantvillage'), ('plantdoc', RAW / 'plantdoc'),
               ('doctor_nabat', RAW / 'doctor_nabat'), ('olive', RAW / 'olive')):
    b, n = du(d)
    log(f'RAW {tag}: bytes={b/1e9:.2f}G files={n}')
disk('v4-downloaded')

# ── 3. taxonomy: 15 crop classes ─────────────────────────────────────────────
CROPS = ['Tomato', 'Potato', 'Olive', 'Wheat', 'Pepper', 'Apple', 'Corn', 'Grape',
         'Peach', 'Cherry', 'Strawberry', 'Squash', 'Soybean', 'Raspberry', 'Healthy']
CROP_KEYS = {'tomato': 'Tomato', 'potato': 'Potato', 'olive': 'Olive', 'oliva': 'Olive',
             'wheat': 'Wheat', 'ble': 'Wheat', 'durum': 'Wheat',
             'pepper': 'Pepper', 'poivron': 'Pepper', 'apple': 'Apple', 'pomme': 'Apple',
             'corn': 'Corn', 'maize': 'Corn', 'mais': 'Corn', 'grape': 'Grape', 'raisin': 'Grape',
             'peach': 'Peach', 'peche': 'Peach', 'cherry': 'Cherry', 'cerisier': 'Cherry',
             'strawberry': 'Strawberry', 'fraise': 'Strawberry', 'squash': 'Squash',
             'soybean': 'Soybean', 'soyabean': 'Soybean', 'raspberry': 'Raspberry',
             'orange': None, 'blueberry': None}


def crop_of(path_parts):
    s = ' '.join(path_parts).lower()
    if 'healthy' in s or 'sain' in s:
        # healthy leaf of a known crop -> that crop if identifiable else Healthy
        for k, v in CROP_KEYS.items():
            if v and k in s:
                return v
        return 'Healthy'
    for k, v in CROP_KEYS.items():
        if k in s:
            return v  # None = excluded crop
    return 'UNMAPPED'


IMG_EXTS = ('.jpg', '.jpeg', '.png', '.webp', '.bmp')
pool = defaultdict(list)  # (crop, source) -> [paths]
unmapped = Counter()
for source, base in (('lab', RAW / 'plantvillage'), ('field_plantdoc', RAW / 'plantdoc'),
                     ('field_doctor', RAW / 'doctor_nabat'), ('field_olive', RAW / 'olive')):
    if not base.exists():
        note(f'source {source} missing, skipped')
        continue
    for f in base.rglob('*'):
        if not f.is_file() or f.suffix.lower() not in IMG_EXTS or f.stat().st_size < 2000:
            continue
        try:
            rel = [p for p in f.relative_to(base).parts]
        except Exception:
            continue
        c = crop_of(rel)
        if c is None:
            unmapped['excluded_crop:' + rel[0][:30]] += 1
        elif c == 'UNMAPPED':
            unmapped['unmapped:' + (rel[0][:30] if rel else '?')] += 1
        else:
            pool[(c, source)].append(f)
tot_pool = sum(len(v) for v in pool.values())
log(f'POOL total={tot_pool} keys={len(pool)} unmapped={dict(unmapped)}')
for k in sorted(pool):
    log(f'POOL {k[0]}/{k[1]}: {len(pool[k])}')
if tot_pool == 0:
    note('empty pool, abort')
    LOGF.close()
    sys.exit(3)

# ── blend 60/40 lab/field in train; stratified 70/15/15 ──────────────────────
rng = random.Random(7)
from PIL import Image as PImage
staged = defaultdict(list)  # split -> [(path, crop, source)]


def split70(p_list):
    n = len(p_list)
    if n < 6:
        return p_list, [], []
    nv = max(1, int(n * 0.15))
    nt = max(1, int(n * 0.15))
    return p_list[:n - nv - nt], p_list[n - nv - nt:n - nt], p_list[n - nt:]


long_tail = []
for crop in CROPS:
    items_lab = pool.get((crop, 'lab'), [])
    items_field = [p for s in ('field_plantdoc', 'field_doctor', 'field_olive')
                   for p in pool.get((crop, s), [])]
    rng.shuffle(items_lab)
    rng.shuffle(items_field)
    # keep ALL data: 70/15/15 per source; 60/40 lab/field enforced at BATCH level via sampler
    tr_lab, va_lab, te_lab = split70(items_lab)
    tr_f, va_f, te_f = split70(items_field)
    if len(items_lab) + len(items_field) < 6:
        long_tail.append(crop)
    for p in tr_lab:
        staged['train'].append((p, crop, 'lab'))
    for p in tr_f:
        staged['train'].append((p, crop, 'field'))
    for p in va_lab:
        staged['val'].append((p, crop, 'lab'))
    for p in va_f:
        staged['val'].append((p, crop, 'field'))
    for p in te_lab:
        staged['test'].append((p, crop, 'lab'))
    for p in te_f:
        staged['test'].append((p, crop, 'field'))
log(f'BLEND long-tail all-train crops: {long_tail}')
_ntr_lab = sum(1 for _, _, s in staged['train'] if s == 'lab')
_ntr_f = sum(1 for _, _, s in staged['train'] if s == 'field')
log(f'BLEND train pool lab={_ntr_lab} field={_ntr_f} (60/40 enforced in sampler, all data kept)')
if (V4).exists():
    shutil.rmtree(V4)


def stage_copy(items, split):
    from PIL import Image as PImage
    n = 0
    for src, crop, srcname in items:
        try:
            im = PImage.open(src).convert('RGB').resize((256, 256), PImage.BILINEAR)
            d = V4 / split / crop
            d.mkdir(parents=True, exist_ok=True)
            im.save(d / f'{srcname}_{n:06d}.jpg', quality=85)
            n += 1
        except Exception:
            continue
    return n


counts = {}
for s in ('train', 'val', 'test'):
    counts[s] = stage_copy(staged[s], s)
    lab_n = sum(1 for _, _, so in staged[s] if so == 'lab')
    log(f'V4 {s}: n={counts[s]} lab_frac={lab_n/max(counts[s],1):.3f}')
    cc = Counter(c for _, c, _ in staged[s])
    log(f'V4 {s} per-crop: {dict(cc)}')
(V4 / 'classes.json').write_text(json.dumps({'classes': CROPS}, indent=2))
disk('v4-staged')

# ── 4/5. torch: aug + effnet-b2 training ─────────────────────────────────────
import torch
import torch.nn as nn
import torch.nn.functional as F
import timm
log(f'TORCH {torch.__version__} cuda={torch.cuda.is_available()}')
USE_CUDA = torch.cuda.is_available()
DEVICE = torch.device('cuda' if USE_CUDA else 'cpu')
IMG = 256
BATCH = 48
EPOCHS = 20
torch.manual_seed(7)
NC = len(CROPS)

import albumentations as A
AUG_LIST = []
try:
    AUG_LIST = [A.RandomShadow(p=0.4),
                A.RandomSunFlare(flare_roi=(0, 0, 1, 0.5), angle_lower=0.5, p=0.3)]
    log('AUG shadow+flare: spec params accepted')
except TypeError as e:
    log(f'AUG spec flare params rejected ({e}); fallback flare')
    AUG_LIST = [A.RandomShadow(p=0.4), A.RandomSunFlare(p=0.3)]
try:
    AUG_LIST += [A.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.15, p=0.5)]
except TypeError as e:
    AUG_LIST += [A.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, p=0.5)]
    log(f'AUG jitter fallback (no hue): {e}')
try:
    AUG_LIST += [A.ShiftScaleRotate(shift_limit=0.1, scale_limit=0.15, rotate_limit=45, p=0.5)]
except Exception as e:
    AUG_LIST += [A.Affine(translate_percent=0.1, scale=(0.85, 1.15), rotate=(-45, 45), p=0.5)]
    log(f'AUG affine fallback: {e}')
try:
    AUG_LIST += [A.CoarseDropout(max_holes=8, max_height=32, max_width=32, p=0.4)]
except TypeError as e:
    AUG_LIST += [A.CoarseDropout(num_holes_range=(1, 8), hole_height_range=(8, 32),
                                 hole_width_range=(8, 32), p=0.4)]
    log(f'AUG dropout fallback: {e}')
AUG_LIST += [A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225))]
train_aug = A.Compose(AUG_LIST)
val_aug = A.Compose([A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225))])
log(f'AUG pipeline: {[type(a).__name__ for a in AUG_LIST]}')


class V4Folder(torch.utils.data.Dataset):
    def __init__(self, split, aug):
        self.aug = aug
        self.items = []
        base = V4 / split
        for i, c in enumerate(CROPS):
            d = base / c
            if d.exists():
                for f in sorted(d.iterdir()):
                    self.items.append((str(f), i))

    def __len__(self):
        return len(self.items)

    def __getitem__(self, i):
        p, y = self.items[i]
        arr = np.array(PImage.open(p).convert('RGB').resize((IMG, IMG), PImage.BILINEAR))
        t = self.aug(image=arr)['image']
        t = torch.from_numpy(t).permute(2, 0, 1).float()
        return t, y


tr_ds, va_ds, te_ds = V4Folder('train', train_aug), V4Folder('val', val_aug), V4Folder('test', val_aug)
log(f'DS train={len(tr_ds)} val={len(va_ds)} test={len(te_ds)}')
from torch.utils.data import DataLoader, WeightedRandomSampler
# 60/40 lab/field batch blend x inverse-sqrt crop frequency (all data kept, nothing capped)
_tr_paths = [p for p, _ in tr_ds.items]
_tr_lab_n = sum(1 for p in _tr_paths if Path(p).name.startswith('lab_'))
_tr_f_n = len(_tr_paths) - _tr_lab_n
_crop_n = Counter(y for _, y in tr_ds.items)
_w = []
for p, y in tr_ds.items:
    src_w = (0.6 / max(_tr_lab_n, 1)) if Path(p).name.startswith('lab_') else (0.4 / max(_tr_f_n, 1))
    _w.append(src_w / max(_crop_n[y] ** 0.5, 1))
log(f'SAMPLER train lab={_tr_lab_n} field={_tr_f_n} expected_batch_lab_frac~0.60 crop_counts={dict(_crop_n)}')
tr_l = DataLoader(tr_ds, batch_size=BATCH,
                  sampler=WeightedRandomSampler(_w, len(_w), replacement=True), num_workers=0)
va_l = DataLoader(va_ds, batch_size=BATCH, shuffle=False, num_workers=0)
te_l = DataLoader(te_ds, batch_size=BATCH, shuffle=False, num_workers=0)

model = timm.create_model('efficientnet_b2', pretrained=True, num_classes=NC).to(DEVICE)
crit = nn.CrossEntropyLoss(label_smoothing=0.1)
opt = torch.optim.AdamW(model.parameters(), lr=3e-4, weight_decay=1e-2)
sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=EPOCHS)
scaler = torch.amp.GradScaler('cuda') if USE_CUDA else None
log(f'MODEL efficientnet_b2 params={sum(p.numel() for p in model.parameters())/1e6:.2f}M')
best_va, best_path = 0.0, ROOT / 'v4_best.pt'
ckpt_path = ROOT / 'v4_ckpt.pt'
start_e = 0
if ckpt_path.exists():
    try:
        ck = torch.load(ckpt_path, map_location=DEVICE)
        model.load_state_dict(ck['model'])
        opt.load_state_dict(ck['opt'])
        sched.load_state_dict(ck['sched'])
        start_e = int(ck['epoch'])
        best_va = float(ck.get('best_va', 0.0))
        log(f'RESUME ckpt epoch={start_e} best_va={best_va:.4f}')
    except Exception as e:
        log(f'RESUME ckpt unreadable ({e}); trying v4_best.pt weights')
        try:
            model.load_state_dict(torch.load(best_path, map_location=DEVICE))
            log('RESUME loaded v4_best.pt weights, restart epoch count at 1')
        except Exception as e2:
            log(f'RESUME no weights ({e2}); from scratch')
elif best_path.exists():
    try:
        model.load_state_dict(torch.load(best_path, map_location=DEVICE))
        log('RESUME loaded v4_best.pt weights (no ckpt)')
    except Exception as e:
        log(f'RESUME best unreadable: {e}')
for e in range(start_e, EPOCHS):
    t0e = time.time()
    if USE_CUDA:
        torch.cuda.empty_cache()
    model.train()
    tl, tc, tt, bad = 0.0, 0, 0, 0
    for x, y in tr_l:
        try:
            x, y = x.to(DEVICE), y.to(DEVICE)
            opt.zero_grad()
            if USE_CUDA:
                with torch.amp.autocast('cuda'):
                    out = model(x)
                    loss = crit(out, y)
            else:
                out = model(x)
                loss = crit(out, y)
            if scaler:
                scaler.scale(loss).backward()
                scaler.step(opt)
                scaler.update()
            else:
                loss.backward()
                opt.step()
            tl += loss.item() * len(y)
            tc += (out.argmax(1) == y).sum().item()
            tt += len(y)
        except Exception as be:
            bad += 1
            if bad <= 3:
                log(f'EPOCH e{e+1} bad batch skipped: {type(be).__name__} {str(be)[:120]}')
            continue
    sched.step()
    model.eval()
    vc, vt = 0, 0
    with torch.no_grad():
        for x, y in va_l:
            x, y = x.to(DEVICE), y.to(DEVICE)
            vc += (model(x).argmax(1) == y).sum().item()
            vt += len(y)
    va = vc / max(vt, 1)
    log(f'EPOCH e{e+1}/{EPOCHS} loss={tl/max(tt,1):.4f} train_acc={tc/max(tt,1):.4f} val_acc={va:.4f} lr={sched.get_last_lr()[0]:.6f} bad_batches={bad} t={time.time()-t0e:.0f}s')
    torch.save({'model': model.state_dict(), 'opt': opt.state_dict(), 'sched': sched.state_dict(),
                'epoch': e + 1, 'best_va': best_va}, ckpt_path)
    if va > best_va:
        best_va = va
        torch.save(model.state_dict(), best_path)
        log(f'EPOCH new best val_acc={va:.4f}')
log(f'TRAIN done best_val_acc={best_va:.4f}')
model.load_state_dict(torch.load(best_path, map_location=DEVICE))
for p in model.parameters():
    p.requires_grad_(False)
model.eval()
log('BACKBONE frozen')

# ── 6. temperature scaling (L-BFGS-B on val NLL) ─────────────────────────────
with torch.no_grad():
    VL, VY = [], []
    for x, y in va_l:
        VL.append(model(x.to(DEVICE)).cpu())
        VY.append(y)
    VL = torch.cat(VL).numpy()
    VY = torch.cat(VY).numpy()
    TL, TY, TSRC = [], [], []
    for x, y in te_l:
        TL.append(model(x.to(DEVICE)).cpu())
        TY.append(y)
    TL = torch.cat(TL).numpy()
    TY = torch.cat(TY).numpy()
log(f'LOGITS val={VL.shape} test={TL.shape}')


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
        m = (conf > bins[i]) & (conf <= bins[i + 1])
        if m.sum():
            gap = abs(ok[m].mean() - conf[m].mean())
            ece += m.sum() / len(labels) * gap
            mce = max(mce, gap)
    return float(ece), float(mce)


def nll_T(logT, logits, labels):
    T = float(np.exp(logT[0]))
    p = softmax(logits / T)
    return float(-np.log(p[np.arange(len(labels)), labels] + 1e-12).mean())


from scipy.optimize import minimize
res = minimize(nll_T, x0=np.array([0.0]), args=(VL, VY), method='L-BFGS-B')
Tstar = float(np.exp(res.x[0]))
log(f'TSCALER L-BFGS-B success={res.success} nll_fun={res.fun:.4f} T*={Tstar:.4f}')
p_before, p_after = softmax(VL), softmax(VL / Tstar)
ece_b, mce_b = ece_mce(p_before, VY)
ece_a, mce_a = ece_mce(p_after, VY)
log(f'CALIB val ECE {ece_b:.4f}->{ece_a:.4f} MCE {mce_b:.4f}->{mce_a:.4f}')

# test acc: lab vs field (source encoded in filename prefix)
tp = softmax(TL / Tstar)
yp = tp.argmax(1)
acc_all = float((yp == TY).mean())
lab_mask = np.array(['lab_' in p for p, _ in te_ds.items])
acc_lab = float((yp[lab_mask] == TY[lab_mask]).mean()) if lab_mask.sum() else float('nan')
acc_field = float((yp[~lab_mask] == TY[~lab_mask]).mean()) if (~lab_mask).sum() else float('nan')
log(f'TEST acc_all={acc_all:.4f} (n={len(TY)}) acc_lab={acc_lab:.4f} (n={int(lab_mask.sum())}) acc_field={acc_field:.4f} (n={int((~lab_mask).sum())})')

# ── 7. export + report ───────────────────────────────────────────────────────
class CalibratedWrapper(nn.Module):
    def __init__(self, backbone, T, classes):
        super().__init__()
        self.backbone = backbone
        self.T = float(T)
        self.classes = classes

    def forward(self, x):
        return F.softmax(self.backbone(x) / self.T, dim=1)


wrap = CalibratedWrapper(model, Tstar, CROPS).eval()
ts_path = ROOT / 'ziria_v4_calibrated.pt'
traced = torch.jit.trace(wrap.cpu(), torch.zeros(1, 3, IMG, IMG))
traced.save(str(ts_path))
back = torch.jit.load(str(ts_path))
with torch.no_grad():
    pv = back(torch.zeros(1, 3, IMG, IMG))
log(f'EXPORT TorchScript ok out_shape={list(pv.shape)} bytes={ts_path.stat().st_size}')
# one real inference
sample = sorted((V4 / 'test').rglob('*.jpg'))[0]
t = val_aug(image=np.array(PImage.open(sample).convert('RGB').resize((IMG, IMG))))['image']
t = torch.from_numpy(t).permute(2, 0, 1).float().unsqueeze(0)
with torch.no_grad():
    pr = back(t)
log(f'VERIFY {sample.parent.name}/{sample.name}: pred={CROPS[int(pr.argmax())]} conf={float(pr.max()):.4f}')

report = {'date': ts(), 'classes': CROPS, 'n_classes': NC,
          'counts': counts, 'best_val_acc': round(best_va, 4),
          'temperature_Tstar': round(Tstar, 4), 'lbfgs_success': bool(res.success),
          'val_ece_before': round(ece_b, 4), 'val_ece_after': round(ece_a, 4),
          'val_mce_before': round(mce_b, 4), 'val_mce_after': round(mce_a, 4),
          'test_acc_all': round(acc_all, 4),
          'test_acc_lab': round(acc_lab, 4) if acc_lab == acc_lab else 'not measured',
          'test_acc_field': round(acc_field, 4) if acc_field == acc_field else 'not measured',
          'test_n': len(TY), 'test_n_lab': int(lab_mask.sum()), 'test_n_field': int((~lab_mask).sum()),
          'sources': {'plantvillage': ok_pv, 'plantdoc': ok_pd, 'doctor_nabat': ok_dn, 'olive': ok_olive},
          'unmapped': dict(unmapped), 'notes': NOTES}
(ROOT / 'v4_metrics_report.json').write_text(json.dumps(report, indent=2))
log('REPORT v4_metrics_report.json written')
disk('v4-done')
log(f'DONE total_h={(time.time()-T0)/3600:.2f}')
print('V4_SUMMARY ' + json.dumps({k: report[k] for k in ('temperature_Tstar', 'val_ece_before', 'val_ece_after', 'test_acc_all', 'test_acc_lab', 'test_acc_field')}), flush=True)
LOGF.close()
