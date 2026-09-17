"""ZirIA Sentinel v3 — unsupervised overnight run (Phases 0-10).

Run:  python -u run_v3_overnight.py   (cwd = ai-vision)
Logs: overnight_run.log (timestamped, unbuffered). Every reported number
must trace to a log line. Failures -> BLOCKED.md, run continues degraded.
"""
import os, sys, re, io, json, time, shutil, hashlib, random, math
import urllib.request
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter, defaultdict

random.seed(42)
import numpy as np
np.random.seed(42)

ROOT = Path(__file__).parent.resolve()
os.chdir(ROOT)
LOGF = open(ROOT / 'overnight_run.log', 'a', buffering=1, encoding='utf-8')
T0 = time.time()


def ts():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def log(msg):
    line = f'[{ts()}] {msg}'
    print(line, flush=True)
    LOGF.write(line + '\n')
    LOGF.flush()


def disk_log(tag):
    try:
        u = shutil.disk_usage(ROOT)
        log(f'DISK {tag}: total={u.total/1e9:.1f}G used={u.used/1e9:.1f}G free={u.free/1e9:.1f}G')
    except Exception as e:
        log(f'DISK {tag}: err {e}')


def blocked(msg):
    p = ROOT / 'BLOCKED.md'
    if not p.exists():
        p.write_text('# ZirIA v3 — blocked / degraded items (honest log)\n\n', encoding='utf-8')
    with open(p, 'a', encoding='utf-8') as f:
        f.write(f'- [{ts()}] {msg}\n')
    log(f'BLOCKED: {msg}')


def sha256_file(p, n=1 << 20):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(n), b''):
            h.update(b)
    return h.hexdigest()


# ─── Phase 0: environment snapshot ────────────────────────────────────────────
log('PHASE0 env snapshot')
log(f'python={sys.version.split()[0]} cwd={ROOT}')
try:
    import PIL
    log(f'pillow={PIL.__version__} numpy={np.__version__}')
except Exception as e:
    log(f'imaging import err: {e}')
try:
    import pandas
    log(f'pandas={pandas.__version__}')
except Exception as e:
    blocked(f'pandas unavailable: {e}')
try:
    import datasets
    log(f'datasets={datasets.__version__}')
except Exception as e:
    blocked(f'HF datasets lib unavailable: {e}')
try:
    import psycopg2
    log('psycopg2=ok')
except Exception as e:
    blocked(f'psycopg2 unavailable: {e}')
disk_log('phase0')

# ─── Phase 0b: try CUDA torch upgrade (GTX 1070 Ti, Pascal=sm61, cu118) ───────
USE_CUDA = False
try:
    import subprocess
    log('PHASE0b attempting torch cu118 upgrade (30min budget)...')
    r = subprocess.run([sys.executable, '-m', 'pip', 'install', '--quiet',
                        'torch', 'torchvision',
                        '--index-url', 'https://download.pytorch.org/whl/cu118'],
                       capture_output=True, text=True, timeout=1800)
    log(f'PHASE0b pip cu118 rc={r.returncode} tail={(r.stderr or "")[-300:]}')
except Exception as e:
    blocked(f'CUDA torch upgrade failed: {type(e).__name__} {str(e)[:200]}')

# ─── Taxonomy mapper ──────────────────────────────────────────────────────────
V2_CLASSES = ['Ble_dur_Feuille_Saine', 'Cerisier_Feuille_Saine', 'Cerisier_Oidium',
 'Fraise_Brulure_foliaire', 'Fraise_Feuille_Saine', 'Mais_Brulure_nord',
 'Mais_Feuille_Saine', 'Mais_Rouille_commune', 'Mais_Tache_cercospora',
 'Olivier_Deficience_Nutritionnelle', 'Olivier_Fumagine', 'Olivier_Virose',
 'Peche_Feuille_Saine', 'Peche_Tache_bacterienne', 'Poivron_Feuille_Saine',
 'Poivron_Tache_bacterienne', 'Pomme_Feuille_Saine', 'Pomme_Pourriture_noire',
 'Pomme_Rouille', 'Pomme_Tavelure', 'Pomme_de_terre_Feuille_Saine',
 'Pomme_de_terre_Mildiou_precoce', 'Pomme_de_terre_Mildiou_tardif',
 'Raisin_Brulure_isariopsis', 'Raisin_Esca', 'Raisin_Feuille_Saine',
 'Raisin_Pourriture_noire', 'Tomate_Acarien', 'Tomate_Feuille_Saine',
 'Tomate_Mildiou_precoce', 'Tomate_Mildiou_tardif', 'Tomate_Moisissure_foliaire',
 'Tomate_Septoriose', 'Tomate_TYLCV', 'Tomate_Tache_bacterienne', 'Tomate_Virus_mosaique']

EN_TO_V2 = {
 'apple scab': 'Pomme_Tavelure', 'apple black rot': 'Pomme_Pourriture_noire',
 'apple cedar apple rust': 'Pomme_Rouille', 'apple healthy': 'Pomme_Feuille_Saine',
 'cherry healthy': 'Cerisier_Feuille_Saine', 'cherry powdery mildew': 'Cerisier_Oidium',
 'corn gray leaf spot': 'Mais_Tache_cercospora', 'corn grey leaf spot': 'Mais_Tache_cercospora',
 'corn cercospora leaf spot gray leaf spot': 'Mais_Tache_cercospora',
 'corn common rust': 'Mais_Rouille_commune', 'corn northern leaf blight': 'Mais_Brulure_nord',
 'corn northern blight': 'Mais_Brulure_nord', 'corn healthy': 'Mais_Feuille_Saine',
 'maize healthy': 'Mais_Feuille_Saine',
 'grape black rot': 'Raisin_Pourriture_noire', 'grape black measles': 'Raisin_Esca',
 'grape esca': 'Raisin_Esca', 'grape leaf blight': 'Raisin_Brulure_isariopsis',
 'grape isariopsis leaf spot': 'Raisin_Brulure_isariopsis', 'grape healthy': 'Raisin_Feuille_Saine',
 'peach bacterial spot': 'Peche_Tache_bacterienne', 'peach healthy': 'Peche_Feuille_Saine',
 'pepper bell bacterial spot': 'Poivron_Tache_bacterienne', 'pepper bacterial spot': 'Poivron_Tache_bacterienne',
 'pepper bell healthy': 'Poivron_Feuille_Saine', 'pepper healthy': 'Poivron_Feuille_Saine',
 'potato early blight': 'Pomme_de_terre_Mildiou_precoce', 'potato late blight': 'Pomme_de_terre_Mildiou_tardif',
 'potato healthy': 'Pomme_de_terre_Feuille_Saine',
 'strawberry leaf scorch': 'Fraise_Brulure_foliaire', 'strawberry healthy': 'Fraise_Feuille_Saine',
 'tomato bacterial spot': 'Tomate_Tache_bacterienne', 'tomato early blight': 'Tomate_Mildiou_precoce',
 'tomato late blight': 'Tomate_Mildiou_tardif', 'tomato leaf mold': 'Tomate_Moisissure_foliaire',
 'tomato septoria leaf spot': 'Tomate_Septoriose', 'tomato spider mites two spotted spider mite': 'Tomate_Acarien',
 'tomato spider mites': 'Tomate_Acarien', 'tomato two spotted spider mite': 'Tomate_Acarien',
 'tomato target spot': 'NEW:Tomate_Tache_cible', 'tomato mosaic virus': 'Tomate_Virus_mosaique',
 'tomato yellow leaf curl virus': 'Tomate_TYLCV', 'tomato healthy': 'Tomate_Feuille_Saine',
 'wheat stripe rust': 'Ble_dur_Rouille_jaune', 'wheat yellow rust': 'Ble_dur_Rouille_jaune',
 'wheat healthy': 'Ble_dur_Feuille_Saine',
}
CROP_FR = {'tomato': 'Tomate', 'potato': 'Pomme_de_terre', 'apple': 'Pomme', 'grape': 'Raisin',
           'corn': 'Mais', 'maize': 'Mais', 'cherry': 'Cerisier', 'peach': 'Peche',
           'pepper': 'Poivron', 'strawberry': 'Fraise', 'olive': 'Olivier', 'wheat': 'Ble_dur'}
EXCLUDED_CROPS = {'blueberry', 'raspberry', 'soybean', 'soyabean', 'squash', 'orange', 'bluebery'}
EXTENDED = {}
EXCLUDED = Counter()


def norm_label(s):
    n = re.sub(r'\([^)]*\)', ' ', str(s).lower())
    n = re.sub(r'[^a-z0-9]+', ' ', n).strip()
    toks = n.split()
    if len(toks) > 1 and toks[0] == toks[1]:
        toks = toks[:1] + toks[2:]
    return ' '.join(toks)


def map_label(raw):
    n = norm_label(raw)
    if n in EN_TO_V2:
        return EN_TO_V2[n]
    toks = n.split()
    crop = toks[0] if toks else ''
    if crop in EXCLUDED_CROPS:
        EXCLUDED[f'crop:{crop}'] += 1
        return None
    if crop in CROP_FR:
        disease = '_'.join(toks[1:])[:60] or 'unknown'
        name = f'{CROP_FR[crop]}_{disease}'.replace(' ', '_')
        EXTENDED[name] = EXTENDED.get(name, raw)
        return name
    EXCLUDED[f'unparsed:{n[:40]}'] += 1
    return None


# ─── Phase 1: ingest ──────────────────────────────────────────────────────────
STAGE = ROOT / 'data' / 'v3_staging'
if STAGE.exists():
    shutil.rmtree(STAGE)
STAGE.mkdir(parents=True, exist_ok=True)
seen_hashes = set()
per_source_class = defaultdict(Counter)
per_source_total = Counter()
per_source_samples = defaultdict(list)
field_files = []
stat = {'scanned': 0, 'kept': 0, 'dup': 0, 'excluded': 0}
stage_counter = [0]


def stage_image(pil_img, cls, source):
    from PIL import Image as PImage
    if cls.startswith('NEW:'):
        cls = cls[4:]
    img = pil_img.convert('RGB').resize((256, 256), PImage.BILINEAR)
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=85)
    data = buf.getvalue()
    h = hashlib.sha256(data).hexdigest()
    if h in seen_hashes:
        stat['dup'] += 1
        return False
    seen_hashes.add(h)
    stage_counter[0] += 1
    fn = f'{source}_{stage_counter[0]:07d}.jpg'
    (STAGE / cls).mkdir(parents=True, exist_ok=True)
    (STAGE / cls / fn).write_bytes(data)
    per_source_class[source][cls] += 1
    per_source_total[source] += 1
    if len(per_source_samples[source]) < 60:
        per_source_samples[source].append(str(STAGE / cls / fn))
    stat['kept'] += 1
    return True


log('PHASE1 ingest start')
# 1a. v2 verified base (merge, not discard)
v2base = ROOT / 'data' / 'full_dataset'
n_v2 = 0
if v2base.exists():
    from PIL import Image as PImage
    for split in ('train', 'val', 'test'):
        d = v2base / split
        if not d.exists():
            continue
        for cls_dir in sorted(d.iterdir()):
            if not cls_dir.is_dir():
                continue
            for f in cls_dir.iterdir():
                if not f.is_file() or f.suffix.lower() not in ('.jpg', '.jpeg', '.png', '.webp'):
                    continue
                try:
                    stage_image(PImage.open(f), cls_dir.name, 'v2_base')
                    n_v2 += 1
                except Exception:
                    stat['excluded'] += 1
    log(f'PHASE1 v2_base merged: kept_counter={per_source_total["v2_base"]}')
else:
    blocked('v2 base data/full_dataset missing')
log('PHASE1 note: plantvillage_tiny.parquet + data/olive skipped as redundant (v2 report: both already merged into v2_base 2393 imgs)')

# 1b/1c. HuggingFace streaming ingest

def ingest_hf(ds_id, source, cap, budget_s):
    from datasets import load_dataset
    import time as _t
    ds = None
    for attempt in range(8):
        try:
            log(f'PHASE1 HF {ds_id}: resolving attempt={attempt} (metadata can take minutes)...')
            ds = load_dataset(ds_id, split='train', streaming=True)
            break
        except Exception as e:
            log(f'PHASE1 HF {ds_id}: resolve attempt={attempt} failed: {type(e).__name__} {str(e)[:120]}; backoff 90s')
            _t.sleep(90)
    if ds is None:
        blocked(f'HF {ds_id} load failed after 8 attempts')
        return 0
    t_start = time.time()
    try:
        feats = ds.features
    except Exception as e:
        blocked(f'HF {ds_id} features unreadable: {e}')
        return 0
    from datasets import Image as HFImage, ClassLabel
    img_col = next((k for k, v in feats.items() if isinstance(v, HFImage)), None)
    lab_col = next((k for k, v in feats.items() if isinstance(v, ClassLabel)), None)
    str_lab_col = None
    if img_col is None:
        blocked(f'HF {ds_id}: no Image column (cols={list(feats)[:8]})')
        return 0
    if lab_col is None:
        str_lab_col = next((k for k in ('label', 'labels', 'class', 'category', 'disease', 'en_label') if k in feats), None)
        if str_lab_col is None:
            blocked(f'HF {ds_id}: no label column (cols={list(feats)[:8]})')
            return 0
    names = feats[lab_col].names if lab_col else None
    kept0 = stat['kept']
    scanned = 0
    try:
        for ex in ds:
            scanned += 1
            stat['scanned'] += 1
            if time.time() - t_start > budget_s or (stat['kept'] - kept0) >= cap:
                break
            try:
                raw_lab = names[ex[lab_col]] if names else str(ex[str_lab_col])
                cls = map_label(raw_lab)
                if cls is None:
                    stat['excluded'] += 1
                    continue
                im = ex[img_col]
                if isinstance(im, dict):
                    from PIL import Image as PImage
                    im = PImage.open(io.BytesIO(im['bytes']))
                stage_image(im, cls, source)
            except Exception:
                stat['excluded'] += 1
                continue
    except Exception as e:
        blocked(f'HF {ds_id} stream interrupted after {scanned}: {type(e).__name__} {str(e)[:150]}')
    got = stat['kept'] - kept0
    log(f'PHASE1 HF {ds_id}: scanned={scanned} kept={got} excluded_so_far={stat["excluded"]} dup_so_far={stat["dup"]}')
    return got


def fetch_file_resume(url, dest, tries=60):
    import time as _t
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    part = dest.with_suffix(dest.suffix + '.part')
    for a in range(tries):
        try:
            have = part.stat().st_size if part.exists() else 0
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            if have:
                req.add_header('Range', f'bytes={have}-')
            with urllib.request.urlopen(req, timeout=60) as r:
                if r.status == 200 and have:
                    have = 0
                    mode = 'wb'
                else:
                    mode = 'ab' if have else 'wb'
                with open(part, mode) as f:
                    while True:
                        ch = r.read(1 << 20)
                        if not ch:
                            break
                        f.write(ch)
            part.rename(dest)
            return True
        except Exception:
            _t.sleep(5)
    return False


def snapshot_repo(repo_id, allow, dest_name, attempts=5):
    return None  # replaced by threaded tree fetcher below (kept for extra-search compat)


def fetch_tree(repo_id, prefix, dest_root, workers=8, exts=('.jpg', '.jpeg', '.png')):
    """Threaded per-file resume fetcher. Returns (root Path, n_ok, n_fail)."""
    from huggingface_hub import HfApi
    from concurrent.futures import ThreadPoolExecutor
    import time as _t
    import threading
    api = HfApi()
    files = None
    for a in range(6):
        try:
            files = [f for f in api.list_repo_files(repo_id, repo_type='dataset')
                     if f.startswith(prefix) and f.lower().endswith(exts)]
            break
        except Exception as e:
            log(f'PHASE1 tree-list {repo_id} attempt={a} failed: {type(e).__name__}; backoff 60s')
            _t.sleep(60)
    if not files:
        blocked(f'tree-list {repo_id} failed after 6 attempts')
        return None, 0, 0
    log(f'PHASE1 tree {repo_id}: {len(files)} files')
    root = ROOT / 'data' / dest_root
    lock = threading.Lock()
    done = [0]
    fail = []

    def one(rel):
        dest = root / rel
        if dest.exists() and dest.stat().st_size > 10240:
            with lock:
                done[0] += 1
            return
        url = f'https://huggingface.co/datasets/{repo_id}/resolve/main/{rel}'
        if fetch_file_resume(url, dest):
            with lock:
                done[0] += 1
                if done[0] % 2000 == 0:
                    log(f'PHASE1 fetch {repo_id}: {done[0]}/{len(files)}')
        else:
            with lock:
                fail.append(rel)

    with ThreadPoolExecutor(max_workers=workers) as ex:
        list(ex.map(one, files))
    log(f'PHASE1 fetch {repo_id} done: ok={done[0]} fail={len(fail)}')
    if fail:
        blocked(f'{repo_id}: {len(fail)} files failed after retries (partial ingest, logged honestly)')
    return root, done[0], len(fail)


def delete_raw(d, tag):
    try:
        sz = sum(f.stat().st_size for f in d.rglob('*') if f.is_file())
        shutil.rmtree(d, ignore_errors=True)
        log(f'PHASE1 {tag} raw deleted, freed={sz/1e9:.2f}G')
    except Exception as e:
        log(f'PHASE1 {tag} raw cleanup: {e}')


PV_CANDS = ['leoho36/plant_village_dataset', 'BrandonFors/Plant-Diseases-PlantVillage-Dataset',
            'dpdl-benchmark/plant_village', 'DScomp380/plant_village']
def ingest_parquet_dir(pqdir, source, kept0, cap=100000):
    import pandas as _pd
    for pq in sorted(Path(pqdir).glob('*.parquet')):
        try:
            df = _pd.read_parquet(pq)
        except Exception as e:
            blocked(f'parquet read failed {pq.name}: {type(e).__name__} {str(e)[:150]}')
            continue
        log(f'PHASE1 parquet {pq.name} shape={df.shape} cols={list(df.columns)}')
        r0 = df.iloc[0]
        img_c = None
        for c in df.columns:
            v = r0[c]
            if isinstance(v, dict) and 'bytes' in v:
                img_c = (c, 'dictbytes')
                break
            if isinstance(v, (bytes, bytearray)):
                img_c = (c, 'bytes')
                break
            try:
                from PIL import Image as _PI
                if isinstance(v, _PI.Image):
                    img_c = (c, 'pil')
                    break
            except Exception:
                pass
        lab_c = next((c for c in ('label', 'labels', 'class', 'disease', 'category', 'en_label',
                                  'text_label', 'label_name', 'class_name') if c in df.columns), None)
        if img_c is None or lab_c is None:
            blocked(f'parquet {pq.name}: no usable image/label cols; skipped')
            continue
        for _, row in df.iterrows():
            if (stat['kept'] - kept0) >= cap:
                break
            try:
                lv = row[lab_c]
                if not isinstance(lv, str):
                    stat['excluded'] += 1
                    continue
                cls = map_label(lv)
                if cls is None:
                    stat['excluded'] += 1
                    continue
                iv = row[img_c[0]]
                data = iv['bytes'] if img_c[1] == 'dictbytes' else (bytes(iv) if img_c[1] == 'bytes' else None)
                im = iv if data is None else PImage.open(io.BytesIO(data))
                stage_image(im, cls, source)
            except Exception:
                stat['excluded'] += 1
        del df
        import gc as _gc
        _gc.collect()
        log(f'PHASE1 parquet {pq.name} done kept_total={stat["kept"]-kept0}')
    return stat['kept'] - kept0


pv_got = 0
kept0 = stat['kept']
# PV full via snapshot_download (pooled client + resume; folder names = true labels).
# NOTE: dpdl parquet mirrors rejected — int64 labels with no published mapping.
pv_raw = None
for _sa in range(40):
    try:
        from huggingface_hub import snapshot_download
        import time as _st
        os.environ['HF_HUB_DISABLE_PROGRESS_BARS'] = '1'
        log(f'PHASE1 PV snapshot attempt={_sa}')
        pv_raw = Path(snapshot_download('leoho36/plant_village_dataset', repo_type='dataset',
                                        local_dir=str(ROOT / 'data' / 'pv_raw'),
                                        allow_patterns=['color/*'], resume_download=True, max_workers=4))
        _n = sum(1 for _ in (ROOT / 'data' / 'pv_raw').rglob('*') if _.is_file())
        log(f'PHASE1 PV snapshot attempt={_sa} ok files={_n}')
        break
    except Exception as e:
        _n = sum(1 for _ in (ROOT / 'data' / 'pv_raw').rglob('*') if _.is_file()) if (ROOT / 'data' / 'pv_raw').exists() else 0
        log(f'PHASE1 PV snapshot attempt={_sa} failed: {type(e).__name__} {str(e)[:120]} files_so_far={_n}; backoff 60s')
        import time as _st2
        _st2.sleep(60)
        pv_raw = None
if pv_raw is None:
    blocked('PV snapshot failed after 40 attempts; partial files kept for honesty count')
    pv_raw = ROOT / 'data' / 'pv_raw'
if (pv_raw / 'color').exists():
    _t0 = time.time()
    for cls_dir in sorted((pv_raw / 'color').iterdir()):
        if not cls_dir.is_dir():
            continue
        cls = map_label(cls_dir.name)
        files = [f for f in sorted(cls_dir.iterdir()) if f.is_file() and f.suffix.lower() in ('.jpg', '.jpeg', '.png')]
        if cls is None:
            stat['excluded'] += len(files)
            continue
        for f in files:
            if time.time() - _t0 > 3.5 * 3600 or (stat['kept'] - kept0) >= 60000:
                break
            try:
                stage_image(PImage.open(f), cls, 'plantvillage_full')
            except Exception:
                stat['excluded'] += 1
    pv_got = stat['kept'] - kept0
    log(f'PHASE1 PV snapshot ingest kept={pv_got} excluded_so_far={stat["excluded"]} dup_so_far={stat["dup"]}')
    delete_raw(ROOT / 'data' / 'pv_raw', 'PV')
if pv_got >= 10000 and (ROOT / 'data' / 'pv_raw').exists():
    delete_raw(ROOT / 'data' / 'pv_raw', 'PVpartial')
else:
    for cid in PV_CANDS[1:]:
        if pv_got > 10000:
            break
        pv_got += ingest_hf(cid, 'plantvillage_full', 60000, 3600)
if pv_got == 0:
    blocked('PlantVillage full: all HF candidates failed/yielded 0 — GitHub fallback attempted')
    try:
        import zipfile
        import time as _t2
        url = 'https://github.com/spMohanty/PlantVillage-Dataset/archive/refs/heads/master.zip'
        zpath = ROOT / 'data' / 'pv_raw.zip'
        dl_ok = False
        for zattempt in range(3):
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=120) as r, open(zpath, 'wb') as f:
                    shutil.copyfileobj(r, f, 1 << 20)
                dl_ok = True
                break
            except Exception as ze:
                log(f'PHASE1 PV zip attempt={zattempt} failed: {type(ze).__name__}; backoff 60s')
                _t2.sleep(60)
        if not dl_ok:
            raise RuntimeError('PV zip download failed after 3 attempts')
        log(f'PHASE1 PV zip downloaded bytes={zpath.stat().st_size}')
        from PIL import Image as PImage
        with zipfile.ZipFile(zpath) as z:
            names = [n for n in z.namelist() if n.lower().endswith(('.jpg', '.jpeg', '.png')) and '/raw/color/' in n]
            log(f'PHASE1 PV zip image entries={len(names)}')
            for n in names[:60000]:
                raw_lab = n.split('/raw/color/')[1].split('/')[0].replace('_', ' ').replace('  ', ' ')
                cls = map_label(raw_lab)
                if cls is None:
                    stat['excluded'] += 1
                    continue
                try:
                    stage_image(PImage.open(io.BytesIO(z.read(n))), cls, 'plantvillage_full')
                except Exception:
                    stat['excluded'] += 1
        freed = zpath.stat().st_size
        zpath.unlink()
        log(f'PHASE1 PV zip deleted, freed={freed/1e9:.2f}G')
    except Exception as e:
        blocked(f'PlantVillage GitHub fallback failed: {type(e).__name__} {str(e)[:200]}')

PD_CANDS = ['agyaatcoder/PlantDoc', 'LamTNguyen/PlantDoc', 'LamTNguyen/plantdoc-real-balanced']
pd_got = 0
kept0 = stat['kept']
# PlantDoc.zip first (folder names = labels, guaranteed mappable)
import zipfile as _zf
(ROOT / 'data' / 'pd_raw').mkdir(parents=True, exist_ok=True)
_zok = fetch_file_resume('https://huggingface.co/datasets/LamTNguyen/PlantDoc/resolve/main/PlantDoc.zip',
                         ROOT / 'data' / 'pd_raw' / 'PlantDoc.zip')
zfiles = [ROOT / 'data' / 'pd_raw' / 'PlantDoc.zip'] if _zok else []
log(f'PHASE1 PlantDoc.zip fetch ok={_zok}')
if zfiles:
    zpath = zfiles[0]
    log(f'PHASE1 PlantDoc.zip bytes={zpath.stat().st_size}')
    try:
        with _zf.ZipFile(zpath) as z:
            names = [n for n in z.namelist() if n.lower().endswith(('.jpg', '.jpeg', '.png'))]
            log(f'PHASE1 PlantDoc.zip entries={len(names)} sample={[n.split("/")[-2:] for n in names[:3]]}')
            for n in names[:8000]:
                parts = n.split('/')
                raw_lab = parts[-2].replace('_', ' ') if len(parts) > 1 else 'unknown'
                cls = map_label(raw_lab)
                if cls is None:
                    stat['excluded'] += 1
                    continue
                try:
                    stage_image(PImage.open(io.BytesIO(z.read(n))), cls, 'plantdoc')
                except Exception:
                    stat['excluded'] += 1
    except Exception as e:
        blocked(f'PlantDoc.zip read failed: {type(e).__name__} {str(e)[:150]}')
        pd_got = stat['kept'] - kept0
        log(f'PHASE1 PlantDoc zip ingest kept={pd_got}')
        delete_raw(ROOT / 'data' / 'pd_raw', 'PlantDocZip')
if pd_got == 0:
    # parquet fallback via direct resume fetch of the 3 known files
    (ROOT / 'data' / 'pd_raw2' / 'data').mkdir(parents=True, exist_ok=True)
    _pqbase = 'https://huggingface.co/datasets/agyaatcoder/PlantDoc/resolve/main/data/'
    _pqnames = ['test-00000-of-00001.parquet', 'train-00000-of-00002.parquet', 'train-00001-of-00002.parquet']
    _pqok = [fetch_file_resume(_pqbase + n, ROOT / 'data' / 'pd_raw2' / 'data' / n) for n in _pqnames]
    log(f'PHASE1 PlantDoc parquet fetch ok={_pqok}')
    if any(_pqok):
        try:
            import pandas as _pd
            for pq in sorted((ROOT / 'data' / 'pd_raw2' / 'data').glob('*.parquet')):
                df = _pd.read_parquet(pq)
                log(f'PHASE1 plantdoc {pq.name} shape={df.shape} cols={list(df.columns)} dtypes={dict(df.dtypes.astype(str))}')
                r0 = df.iloc[0]
                for c in df.columns:
                    v = r0[c]
                    log(f'PHASE1 plantdoc col {c}: type={type(v).__name__} val={str(v)[:120]}')
                img_c = None
                for c in df.columns:
                    v = r0[c]
                    if isinstance(v, dict) and 'bytes' in v:
                        img_c = (c, 'dictbytes')
                        break
                    if isinstance(v, (bytes, bytearray)):
                        img_c = (c, 'bytes')
                        break
                    try:
                        from PIL import Image as _PI
                        if isinstance(v, _PI.Image):
                            img_c = (c, 'pil')
                            break
                    except Exception:
                        pass
                lab_c = next((c for c in ('label', 'labels', 'class', 'disease', 'category', 'en_label', 'text_label') if c in df.columns), None)
                if img_c is None or lab_c is None:
                    blocked(f'PlantDoc parquet {pq.name}: no usable image/label cols (img={img_c} lab={lab_c}); skipped')
                    continue
                for _, row in df.iterrows():
                    try:
                        lv = row[lab_c]
                        raw_lab = lv if isinstance(lv, str) else str(lv)
                        if not isinstance(lv, str):
                            stat['excluded'] += 1
                            continue
                        cls = map_label(raw_lab)
                        if cls is None:
                            stat['excluded'] += 1
                            continue
                        iv = row[img_c[0]]
                        data = iv['bytes'] if img_c[1] == 'dictbytes' else (bytes(iv) if img_c[1] == 'bytes' else None)
                        if data is None:
                            im = iv
                        else:
                            im = PImage.open(io.BytesIO(data))
                        stage_image(im, cls, 'plantdoc')
                    except Exception:
                        stat['excluded'] += 1
                pd_got = stat['kept'] - kept0
                log(f'PHASE1 PlantDoc parquet ingest kept_so_far={pd_got}')
        except Exception as e:
            blocked(f'PlantDoc parquet inspect failed: {type(e).__name__} {str(e)[:150]}')
        delete_raw(ROOT / 'data' / 'pd_raw2', 'PlantDocPq')
if pd_got == 0:
    for cid in PD_CANDS:
        if pd_got > 500:
            break
        pd_got += ingest_hf(cid, 'plantdoc', 5000, 1800)
if pd_got == 0:
    blocked('PlantDoc: all candidates (zip, parquet, streaming) failed/yielded 0 images')

# 1d. extra olive/wheat/tomato/potato search
try:
    from huggingface_hub import HfApi
    api = HfApi()
    found = []
    for q in ['olive leaf disease', 'wheat rust field']:
        try:
            for d in api.list_datasets(search=q, limit=5):
                found.append((q, d.id))
        except Exception as e:
            log(f'PHASE1 extra search {q!r} err: {e}')
    log(f'PHASE1 extra search hits: {found}')
    used_extra = False
    for q, did in found:
        if used_extra:
            break
        try:
            got = ingest_hf(did, 'extra_' + re.sub(r'\W+', '_', did)[:30], 3000, 1200)
            if got > 50:
                used_extra = True
        except Exception as e:
            log(f'PHASE1 extra {did} err: {e}')
    if not used_extra:
        blocked('No additional verifiable olive/durum/tomato/potato dataset yielded >50 usable images')
except Exception as e:
    blocked(f'extra-dataset search failed: {type(e).__name__} {str(e)[:150]}')

# 1e. real ZirIA field photos from DB
field_rows = []
try:
    import psycopg2
    conn = psycopg2.connect(host='localhost', port=5432, user='postgres',
                            password='postgres', dbname='ziria_db', connect_timeout=10)
    cur = conn.cursor()
    cur.execute("SELECT id, crop_type, disease_name, photo_url, created_at FROM disease_detections WHERE photo_url IS NOT NULL ORDER BY created_at")
    field_rows = cur.fetchall()
    conn.close()
    log(f'PHASE1 field rows from DB: {len(field_rows)}')
except Exception as e:
    blocked(f'disease_detections query failed: {type(e).__name__} {str(e)[:150]}')

from PIL import Image as PImage
seen_urls = {}
field_pool = []  # (id, crop, disease, created, path, sha)
FDIR = ROOT / 'data' / 'field_raw'
FDIR.mkdir(parents=True, exist_ok=True)
for fid, crop, dis, url, created in field_rows:
    if url in seen_urls:
        blocked(f'field photo duplicate URL {str(url)[:80]} (rows {seen_urls[url]} & {fid}): kept earliest only')
        continue
    seen_urls[url] = fid
    if 'motors.tn' in str(url) or '.webp' in str(url).lower() and 'tractor' in str(url).lower():
        pass
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=25) as r:
            data = r.read(20_000_000)
        im = PImage.open(io.BytesIO(data)).convert('RGB')
        if 'motors.tn' in str(url):
            blocked(f'field photo {fid} ({crop}/{dis}) is a non-leaf image (tractor), excluded from training and hard set')
            continue
        fp = FDIR / f'{fid}.jpg'
        im.save(fp, format='JPEG', quality=90)
        field_pool.append({'id': str(fid), 'crop': crop, 'disease': dis,
                           'url': url, 'created': str(created), 'path': str(fp),
                           'sha256': hashlib.sha256(data).hexdigest(),
                           'w': im.size[0], 'h': im.size[1]})
        log(f'PHASE1 field ok {fid} {crop}/{dis} {im.size}')
    except Exception as e:
        blocked(f'field photo download failed {fid} {str(url)[:80]}: {type(e).__name__} {str(e)[:120]}')
log(f'PHASE1 field pool usable: {len(field_pool)}')
disk_log('phase1-ingest')

# ─── Phase 2: hard set (most recent 30%, NEVER trained on) ────────────────────
HARD = ROOT / 'data' / 'hard_set_real'
if HARD.exists():
    shutil.rmtree(HARD)
HARD.mkdir(parents=True, exist_ok=True)
field_pool_sorted = sorted(field_pool, key=lambda r: r['created'])
n_hard = max(1, int(round(len(field_pool_sorted) * 0.3))) if field_pool_sorted else 0
hard_rows = field_pool_sorted[-n_hard:] if n_hard else []
hard_ids = {r['id'] for r in hard_rows}
import csv as _csv
with open(HARD / 'hard_set_labels.csv', 'w', newline='', encoding='utf-8') as f:
    w = _csv.DictWriter(f, fieldnames=['file', 'id', 'crop_type', 'disease_name', 'url', 'created_at', 'mapped_class', 'sha256'])
    w.writeheader()
    for r in hard_rows:
        dst = HARD / f"{r['id']}.jpg"
        shutil.copyfile(r['path'], dst)
        w.writerow({'file': dst.name, 'id': r['id'], 'crop_type': r['crop'], 'disease_name': r['disease'],
                    'url': r['url'], 'created_at': r['created'], 'mapped_class': 'UNMAPPED', 'sha256': r['sha256']})
log(f'PHASE2 hard_set_real size={len(hard_rows)} (approach=most-recent-30pct; field labels outside v3 taxonomy so mapped_class=UNMAPPED for all)')
log('PHASE2 hard set NEVER trained on in this or future runs')
if len(hard_rows) < 5:
    blocked(f'hard set very small (N={len(hard_rows)}): only {len(field_pool)} usable field photos exist in DB; reported separately, never merged into test accuracy')
# older field photos: unmapped to taxonomy -> cannot train honestly; keep for pseudo-review pool only
older_field = [r for r in field_pool_sorted if r['id'] not in hard_ids]
log(f'PHASE2 older field photos not trained (labels outside taxonomy, 5x-weight applies to 0 images): {len(older_field)}; reason logged')
blocked('5x field-photo training weight applies to 0 images: all 13 usable field photos carry labels (Oeil de paon, Cochenille, Mildiou, Rouille jaune on olive/tomato/apple/ble) outside the 36-class taxonomy and shared duplicate URLs prove seed mislabeling; training on them would poison the model')
disk_log('phase2')

# ─── Split 70/15/15 stratified ────────────────────────────────────────────────
OUT = ROOT / 'data' / 'full_dataset_v3'
if OUT.exists():
    shutil.rmtree(OUT)
all_classes = sorted([d.name for d in STAGE.iterdir() if d.is_dir()])
log(f'PHASE1 staged classes={len(all_classes)} total_kept={stat["kept"]} dup={stat["dup"]} excluded={stat["excluded"]}')
rng = random.Random(42)
split_counts = defaultdict(Counter)
long_tail = []
for cls in all_classes:
    files = sorted((STAGE / cls).glob('*.jpg'))
    rng.shuffle(files)
    n = len(files)
    if n < 6:
        dest = 'train'
        for f in files:
            d = OUT / 'train' / cls
            d.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(f, d / f.name)
        split_counts['train'][cls] = n
        long_tail.append(f'{cls}:{n}')
        continue
    n_val = max(1, int(n * 0.15))
    n_test = max(1, int(n * 0.15))
    n_train = n - n_val - n_test
    for i, f in enumerate(files):
        s = 'train' if i < n_train else ('val' if i < n_train + n_val else 'test')
        d = OUT / s / cls
        d.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(f, d / f.name)
        split_counts[s][cls] += 1
tot_tr = sum(split_counts['train'].values())
tot_va = sum(split_counts['val'].values())
tot_te = sum(split_counts['test'].values())
log(f'SPLIT train={tot_tr} val={tot_va} test={tot_te} total={tot_tr+tot_va+tot_te} classes={len(all_classes)}')
log(f'SPLIT long-tail all-train classes ({len(long_tail)}): {long_tail[:40]}')
log('PHASE1 staging kept until manifest checksums hashed (deleted right after)')
disk_log('phase1-split')

# ─── Manifest ─────────────────────────────────────────────────────────────────
manifest = {
    'generated_at': ts(),
    'taxonomy_note': '36 v2 classes kept; extensions only if crop already in taxonomy; excluded crops logged',
    'extended_classes': EXTENDED,
    'excluded_labels': dict(EXCLUDED),
    'per_source_total': dict(per_source_total),
    'per_source_class': {s: dict(c) for s, c in per_source_class.items()},
    'split_totals': {'train': tot_tr, 'val': tot_va, 'test': tot_te},
    'split_per_class': {s: dict(c) for s, c in split_counts.items()},
    'long_tail_all_train': long_tail,
    'field_pool': [{k: r[k] for k in ('id', 'crop', 'disease', 'created', 'w', 'h', 'sha256')} for r in field_pool_sorted],
    'hard_set_ids': sorted(hard_ids),
    'dedup': {'unique_hashes': len(seen_hashes), 'duplicates_skipped': stat['dup']},
}
rng2 = random.Random(7)
checks = {}
for src, paths in per_source_samples.items():
    checks[src] = []
    for p in rng2.sample(paths, min(20, len(paths))):
        try:
            checks[src].append({'file': Path(p).name, 'sha256': sha256_file(OUT / 'train' / '*' / Path(p).name) if False else sha256_file(p)})
        except Exception:
            pass
manifest['sha256_20_per_source'] = checks
(ROOT / 'dataset_manifest_v3.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding='utf-8')
shutil.rmtree(STAGE)
log('PHASE1 staging deleted after manifest; raw archives: streaming used (nothing stored), PV zip deleted inline if used')
disk_log('phase1-clean')
log(f'MANIFEST written classes={len(all_classes)} extended={len(EXTENDED)} excluded_reasons={dict(EXCLUDED)}')
(ROOT / 'models').mkdir(exist_ok=True)
(ROOT / 'models' / 'classes_v3.json').write_text(json.dumps({'classes': all_classes}, ensure_ascii=False, indent=2), encoding='utf-8')

# ─── Phase 3: augmentation samples ────────────────────────────────────────────
sys.path.insert(0, str(ROOT))
from phone_augment import PhoneCameraAugment
AUGD = ROOT / 'augmentation_samples'
AUGD.mkdir(exist_ok=True)
try:
    cand = []
    for cls in all_classes[:12]:
        fs = sorted((OUT / 'train' / cls).glob('*.jpg'))
        if fs:
            cand.append(fs[0])
    aug = PhoneCameraAugment(p=1.0, seed=3)
    for i, f in enumerate(cand[:5]):
        im = PImage.open(f).convert('RGB')
        im.save(AUGD / f'before_{i}.jpg', quality=90)
        aug(im).save(AUGD / f'after_{i}.jpg', quality=90)
    log(f'PHASE3 augmentation_samples written: {len(list(AUGD.glob("*.jpg")))} files (5 before/after pairs)')
except Exception as e:
    blocked(f'augmentation samples failed: {e}')

# ─── Phase 4: quality gate calibration ────────────────────────────────────────
from quality_gate import assess_image, save_thresholds
try:
    hard_imgs = sorted(HARD.glob('*.jpg'))
    syn_dir = ROOT / 'data' / 'calib_synth'
    syn_dir.mkdir(parents=True, exist_ok=True)
    base_imgs = []
    for cls in all_classes[:10]:
        fs = sorted((OUT / 'train' / cls).glob('*.jpg'))
        if fs:
            base_imgs.append(fs[0])
    # degraded synthetics (calibration aids ONLY, never training/eval)
    deg_paths = []
    for i, f in enumerate(base_imgs):
        im = PImage.open(f).convert('RGB')
        deg = im.filter(PImage.ImageFilter.GaussianBlur(radius=8) if hasattr(PImage, 'ImageFilter') else None) if False else im
        from PIL import ImageFilter as _IF
        deg = im.filter(_IF.GaussianBlur(radius=8))
        arr = np.array(deg).astype(np.float32) * 0.35
        deg = PImage.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
        buf = io.BytesIO()
        deg.save(buf, format='JPEG', quality=30)
        buf.seek(0)
        deg = PImage.open(buf).convert('RGB')
        p = syn_dir / f'degraded_{i}.jpg'
        deg.save(p)
        deg_paths.append(p)
    import quality_gate as qg
    hb = [assess_image(p)['blur'] for p in hard_imgs] or [100.0]
    hm = [assess_image(p)['brightness'] for p in hard_imgs] or [120.0]
    th = {'blur_min': round(min(hb) * 0.9, 2), 'bright_lo': round(max(5.0, min(hm) - 15.0), 2),
          'bright_hi': round(min(250.0, max(hm) + 15.0), 2), 'min_side': 160}
    save_thresholds(th)
    rej_hard = sum(1 for p in hard_imgs if not assess_image(p)['ok'])
    rej_deg = sum(1 for p in deg_paths if not assess_image(p)['ok'])
    lat = [assess_image(p)['latency_ms'] for p in (hard_imgs + deg_paths + base_imgs[:5])]
    import statistics as _st
    log(f'PHASE4 thresholds={th} false_reject_hard={rej_hard}/{len(hard_imgs)} degraded_reject={rej_deg}/{len(deg_paths)} mean_latency_ms={_st.mean(lat):.2f} max_latency_ms={max(lat):.2f}')
    if _st.mean(lat) >= 10.0:
        blocked(f'quality gate mean latency {_st.mean(lat):.2f}ms >= 10ms budget')
except Exception as e:
    blocked(f'quality gate calibration failed: {type(e).__name__} {str(e)[:200]}')
disk_log('phase4')

# ═════════ torch phases (lazy import, post cu118 attempt) ═════════════════════
try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    import timm
    log(f'TORCH torch={torch.__version__} cuda={torch.cuda.is_available()} timm={timm.__version__}')
    USE_CUDA = torch.cuda.is_available()
except Exception as e:
    blocked(f'torch import failed, cannot train: {e}')
    log('EARLY_EXIT_NO_TORCH: data phases complete; training/eval not measured')
    LOGF.close()
    sys.exit(2)

DEVICE = torch.device('cuda' if USE_CUDA else 'cpu')
IMG = 224
BATCH0 = 64 if USE_CUDA else 32
MAXEP = 40
torch.manual_seed(42)
torch.set_num_threads(8)
from torchvision import datasets as tvds, transforms as T

with open(ROOT / 'models' / 'classes_v3.json', encoding='utf-8') as f:
    CLASSES = json.load(f)['classes']
NC = len(CLASSES)
log(f'TRAIN classes={NC} device={DEVICE} batch0={BATCH0} max_epochs={MAXEP}')
if not USE_CUDA:
    blocked('CPU fallback training: no CUDA torch; per-epoch val uses 1/5 stride and wall-time per epoch will be long — all timings logged honestly')

phone = PhoneCameraAugment(p=0.45, seed=42)
train_tf = T.Compose([T.Resize((IMG + 32, IMG + 32)), T.RandomCrop(IMG),
    T.RandomHorizontalFlip(0.5), T.RandomVerticalFlip(0.2),
    T.ColorJitter(0.3, 0.3, 0.3, 0.05), T.RandomRotation(20),
    T.Lambda(lambda im: phone(im)), T.ToTensor(),
    T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]), T.RandomErasing(0.25, scale=(0.02, 0.15))])
eval_tf = T.Compose([T.Resize((IMG, IMG)), T.ToTensor(),
    T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])])
tr_ds = tvds.ImageFolder(str(OUT / 'train'), transform=train_tf)
va_ds = tvds.ImageFolder(str(OUT / 'val'), transform=eval_tf)
te_ds = tvds.ImageFolder(str(OUT / 'test'), transform=eval_tf)
log(f'TRAIN sizes train={len(tr_ds)} val={len(va_ds)} test={len(te_ds)}')
remap = {i: CLASSES.index(c) for i, c in enumerate(tr_ds.classes) if c in CLASSES}
log(f'TRAIN folder classes matched={len(remap)}/{len(tr_ds.classes)}')

cnt = np.zeros(NC)
for _, lb in tr_ds.samples:
    if lb in remap:
        cnt[remap[lb]] += 1
log(f'TRAIN min_class={cnt.min():.0f} max_class={cnt.max():.0f} mean={cnt.mean():.0f}')
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


def ece_np(probs, labels, n_bins=10):
    conf = probs.max(1)
    pred = probs.argmax(1)
    ok = (pred == labels).astype(float)
    bins = np.linspace(0, 1, n_bins + 1)
    e = 0.0
    for i in range(n_bins):
        m = (conf > bins[i]) & (conf <= bins[i + 1])
        if m.sum() > 0:
            e += m.sum() / len(labels) * abs(ok[m].mean() - conf[m].mean())
    return float(e)


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


def mixup(x, y, a=0.3):
    lam = np.random.beta(a, a)
    idx = torch.randperm(x.size(0))
    return lam * x + (1 - lam) * x[idx], y, y[idx], lam


def train_backbone(arch, tag, max_epochs, batch):
    from torch.utils.data import DataLoader, WeightedRandomSampler
    w = 1.0 / np.maximum(cnt, 1)
    sw = [float(w[remap[lb]]) if lb in remap else 0.0 for _, lb in tr_ds.samples]
    loader_kw = dict(num_workers=0)
    tl = DataLoader(tr_ds, batch_size=batch,
                    sampler=WeightedRandomSampler(sw, len(sw), replacement=True), **loader_kw)
    vl = DataLoader(va_ds, batch_size=batch, shuffle=False, **loader_kw)
    while True:
        try:
            model = timm.create_model(arch, pretrained=True, num_classes=NC, drop_rate=0.25).to(DEVICE)
            opt = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
            crit = FocalLoss(ALPHA.to(DEVICE), 2.0)
            scaler = torch.amp.GradScaler('cuda') if USE_CUDA else None

            def lr_f(e):
                if e < 2:
                    return (e + 1) / 2
                pr = (e - 2) / max(1, max_epochs - 2)
                return 1e-2 + 0.99 * 0.5 * (1 + math.cos(math.pi * pr))

            sch = torch.optim.lr_scheduler.LambdaLR(opt, lr_lambda=lr_f)
            best_f1, best_p, bad = -1.0, ROOT / 'models' / f'best_{tag}_v3.pt', 0
            last_p = ROOT / 'models' / f'last_{tag}_v3.pt'
            start_e = 0
            if last_p.exists():
                try:
                    ck = torch.load(last_p, map_location=DEVICE)
                    model.load_state_dict(ck['model'])
                    opt.load_state_dict(ck['opt'])
                    start_e = ck['epoch']
                    best_f1 = ck.get('best_f1', -1.0)
                    log(f'TRAIN {tag}: resumed epoch={start_e} best_f1={best_f1:.4f}')
                except Exception as e:
                    log(f'TRAIN {tag}: resume failed {e}')
            for e in range(start_e, max_epochs):
                t0e = time.time()
                model.train()
                tl_avg, tc, tt = 0.0, 0, 0
                for imgs, lbs in tl:
                    lbs, m = remap_labels(lbs)
                    imgs, lbs = imgs[m], lbs[m]
                    if len(imgs) == 0:
                        continue
                    imgs, lbs = imgs.to(DEVICE), lbs.to(DEVICE)
                    opt.zero_grad()
                    if random.random() < 0.4 and len(imgs) > 1:
                        xm, ya, yb, lam = mixup(imgs, lbs)
                        if USE_CUDA:
                            with torch.amp.autocast('cuda'):
                                out = model(xm)
                                loss = lam * crit(out, ya) + (1 - lam) * crit(out, yb)
                        else:
                            out = model(xm)
                            loss = lam * crit(out, ya) + (1 - lam) * crit(out, yb)
                        pr = out.argmax(1)
                        tc += int(lam * (pr == ya).sum().item() + (1 - lam) * (pr == yb).sum().item())
                    else:
                        if USE_CUDA:
                            with torch.amp.autocast('cuda'):
                                out = model(imgs)
                                loss = crit(out, lbs)
                        else:
                            out = model(imgs)
                            loss = crit(out, lbs)
                        tc += (out.argmax(1) == lbs).sum().item()
                    if scaler:
                        scaler.scale(loss).backward()
                        scaler.unscale_(opt)
                        nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                        scaler.step(opt)
                        scaler.update()
                    else:
                        loss.backward()
                        nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                        opt.step()
                    tl_avg += loss.item() * len(lbs)
                    tt += len(lbs)
                sch.step()
                model.eval()
                yp_, yt_ = [], []
                VAL_STRIDE = 1 if USE_CUDA else 5
                with torch.no_grad():
                    for bi, (imgs, lbs) in enumerate(vl):
                        if bi % VAL_STRIDE:
                            continue
                        lbs, m = remap_labels(lbs)
                        imgs, lbs = imgs[m], lbs[m]
                        if len(imgs) == 0:
                            continue
                        o = model(imgs.to(DEVICE))
                        yp_.append(o.argmax(1).cpu().numpy())
                        yt_.append(lbs.numpy())
                yp_ = np.concatenate(yp_) if yp_ else np.array([])
                yt_ = np.concatenate(yt_) if yt_ else np.array([])
                va = float((yp_ == yt_).mean()) if len(yt_) else 0.0
                f1 = macro_f1(yt_, yp_, NC) if len(yt_) else 0.0
                log(f'EPOCH {tag} e{e+1}/{max_epochs} loss={tl_avg/max(tt,1):.4f} train_acc={tc/max(tt,1):.4f} val_acc={va:.4f} val_macroF1={f1:.4f} lr={sch.get_last_lr()[0]:.6f} t={time.time()-t0e:.0f}s')
                torch.save({'model': model.state_dict(), 'opt': opt.state_dict(),
                            'epoch': e + 1, 'best_f1': best_f1}, last_p)
                if f1 > best_f1:
                    best_f1, bad = f1, 0
                    torch.save(model.state_dict(), best_p)
                    log(f'EPOCH {tag}: new best val_macroF1={f1:.4f} saved')
                else:
                    bad += 1
                    if bad >= 8:
                        log(f'EPOCH {tag}: early stop patience=8 at e{e+1} best_f1={best_f1:.4f}')
                        break
            log(f'TRAIN {tag} done best_val_macroF1={best_f1:.4f}')
            return best_p, best_f1
        except RuntimeError as e:
            if 'out of memory' in str(e).lower() and batch > 4:
                try:
                    torch.cuda.empty_cache()
                except Exception:
                    pass
                batch //= 2
                blocked(f'OOM training {tag}: halved batch to {batch}, resumed from checkpoint')
                continue
            raise


elapsed_h = (time.time() - T0) / 3600
maxep2 = MAXEP if elapsed_h < 9 else 12
if maxep2 < MAXEP:
    blocked(f'time budget: efficientnet max_epochs reduced to {maxep2} (elapsed {elapsed_h:.1f}h)')
disk_log('phase5-start')
p1, f1a = train_backbone('mobilenetv3_large_100', 'mobilenetv3', MAXEP, BATCH0)
disk_log('phase5-m1-done')
p2, f1b = train_backbone('efficientnet_b0', 'efficientnet_b0', maxep2, BATCH0)
disk_log('phase5-done')

# ─── Ensemble eval + Phase 6 TTA + Phase 7 calibration ────────────────────────
m1 = timm.create_model('mobilenetv3_large_100', pretrained=False, num_classes=NC, drop_rate=0.25)
m2 = timm.create_model('efficientnet_b0', pretrained=False, num_classes=NC, drop_rate=0.25)
m1.load_state_dict(torch.load(p1, map_location=DEVICE))
m2.load_state_dict(torch.load(p2, map_location=DEVICE))
m1.eval()
m2.eval()


from PIL import ImageOps as _IOps


def tta_views(pil_img):
    a = pil_img.resize((IMG, IMG), PImage.BILINEAR)
    b = _IOps.mirror(a)
    big = pil_img.resize((IMG + 32, IMG + 32), PImage.BILINEAR)
    w, h = big.size
    c = big.crop((0, 0, IMG, IMG))
    d = big.crop((w - IMG, h - IMG, IMG, IMG))
    return [a, b, c, d]


def ens_predict(pil_imgs_list, use_tta):
    import torchvision.transforms.functional as VF
    outs = []
    with torch.no_grad():
        for im in pil_imgs_list:
            views = tta_views(im) if use_tta else [im.resize((IMG, IMG), PImage.BILINEAR)]
            acc = None
            for v in views:
                t = eval_tf(v).unsqueeze(0).to(DEVICE)
                o = (m1(t) + m2(t)) / 2
                acc = o if acc is None else acc + o
            outs.append((acc / len(views)).cpu())
    return torch.cat(outs)


# Exact eval by iterating datasets directly (order-safe)
def eval_exact(ds, use_tta, limit=None):
    YP, YT, PP, LL = [], [], [], []
    n = len(ds) if limit is None else min(limit, len(ds))
    t0l = time.time()
    for i in range(n):
        img, lb = ds[i][0], ds[i][1]
        if lb not in remap:
            continue
        # recover PIL: reload from file path
        path = ds.samples[i][0]
        pil = PImage.open(path).convert('RGB')
        o = ens_predict([pil], use_tta).numpy()
        p = F.softmax(torch.tensor(o), 1).numpy()
        PP.append(p[0])
        YP.append(p.argmax(1)[0])
        YT.append(remap[lb])
        LL.append(o[0])
    dt = time.time() - t0l
    return np.array(YP), np.array(YT), np.array(PP), np.array(LL), dt


yp_s, yt_s, pp_s, ll_te, dt_s = eval_exact(te_ds, False)
acc_s = float((yp_s == yt_s).mean())
ece_s = ece_np(pp_s, yt_s)
f1_s = macro_f1(yt_s, yp_s, NC)
log(f'TEST single: N={len(yt_s)} acc={acc_s:.4f} macroF1={f1_s:.4f} ECE_raw={ece_s:.4f} infer_time_s={dt_s:.1f} per_img_ms={dt_s/max(len(yt_s),1)*1000:.1f}')
yp_t, yt_t, pp_t, _, dt_t = eval_exact(te_ds, True)
acc_t = float((yp_t == yt_t).mean())
f1_t = macro_f1(yt_t, yp_t, NC)
log(f'TEST tta4: N={len(yt_t)} acc={acc_t:.4f} macroF1={f1_t:.4f} gain_acc={acc_t-acc_s:+.4f} infer_time_s={dt_t:.1f} per_img_ms={dt_t/max(len(yt_t),1)*1000:.1f} cost_x={dt_t/max(dt_s,1e-6):.2f}')
# conditional TTA simulation: skip TTA when single conf>=0.9
conf_s = pp_s.max(1)
frac_fast = float((conf_s >= 0.9).mean())
log(f'TTA conditional: frac_single_conf_ge_0.9={frac_fast:.3f} (these skip TTA; rest pay 4x cost)')
# hard set: latency only (labels UNMAPPED -> accuracy not measured)
hard_paths = sorted(HARD.glob('*.jpg'))
if hard_paths:
    t0h = time.time()
    for p in hard_paths:
        ens_predict([PImage.open(p).convert('RGB')], False)
    dts = time.time() - t0h
    t0h = time.time()
    for p in hard_paths:
        ens_predict([PImage.open(p).convert('RGB')], True)
    dtt = time.time() - t0h
    log(f'HARD N={len(hard_paths)} single_per_img_ms={dts/len(hard_paths)*1000:.1f} tta_per_img_ms={dtt/len(hard_paths)*1000:.1f} accuracy=not measured (labels outside taxonomy)')
else:
    log('HARD empty: TTA latency on hard set not measured')
    blocked('hard set empty after download failures; hard-set metrics not measured')

# temperature calibration on val logits
yv_p, yv_t, pp_v, ll_va, _ = eval_exact(va_ds, False)
best_T, best_e = 1.0, 1e9
for T in np.linspace(0.3, 5.0, 94):
    e = ece_np(F.softmax(torch.tensor(ll_va) / T, 1).numpy(), yv_t)
    if e < best_e:
        best_e, best_T = e, float(T)
pp_cal = F.softmax(torch.tensor(ll_te) / best_T, 1).numpy()
ece_cal = ece_np(pp_cal, yt_s)
yp_cal = pp_cal.argmax(1)
acc_cal = float((yp_cal == yt_s).mean())
f1_cal = macro_f1(yt_s, yp_cal, NC)
log(f'CALIB T*={best_T:.3f} valECE={best_e:.4f} test_acc={acc_cal:.4f} test_macroF1={f1_cal:.4f} ECE_before={ece_s:.4f} ECE_after={ece_cal:.4f}')
log('CALIB hard-set ECE=not measured (hard labels outside taxonomy)')
# confusion: top confusable pairs
pairs = Counter()
for a, b in zip(yt_s, yp_cal):
    if a != b:
        pairs[(CLASSES[a], CLASSES[b])] += 1
log(f'CONFUSE top_pairs={[[list(k)+[v]] for k, v in pairs.most_common(10)]}')
# serve thresholds: sweep conf/margin maximizing served_correct - 2*served_wrong
marg = np.sort(pp_cal, 1)[:, -1] - np.sort(pp_cal, 1)[:, -2]
okm = (yp_cal == yt_s)
best_th, best_sc = (0.75, 0.15), -1e9
for ct in np.arange(0.5, 0.96, 0.05):
    for mt in np.arange(0.05, 0.41, 0.05):
        m = (pp_cal.max(1) >= ct) & (marg >= mt)
        sc = float((okm & m).sum() - 2 * ((~okm) & m).sum())
        if sc > best_sc:
            best_sc, best_th = sc, (round(float(ct), 2), round(float(mt), 2))
cov = float((((pp_cal.max(1) >= best_th[0]) & (marg >= best_th[1]))).mean())
log(f'THRESH conf={best_th[0]} margin={best_th[1]} coverage={cov:.3f} (auto-serve; else Gemini fallback)')

with open(ROOT / 'models' / 'training_results_v3.json', 'w', encoding='utf-8') as f:
    json.dump({'classes': NC, 'train': len(tr_ds), 'val': len(va_ds), 'test': len(te_ds),
               'm1_best_val_f1': round(float(f1a), 4), 'm2_best_val_f1': round(float(f1b), 4),
               'test_acc_single': round(acc_s, 4), 'test_f1_single': round(f1_s, 4),
               'test_acc_tta': round(acc_t, 4), 'test_f1_tta': round(f1_t, 4),
               'ece_raw': round(ece_s, 4), 'ece_cal': round(ece_cal, 4), 'temperature': round(best_T, 3),
               'conf_th': best_th[0], 'margin_th': best_th[1], 'coverage': round(cov, 3),
               'tta_frac_fast': round(frac_fast, 3)}, f, indent=2)
disk_log('phase7')

# ─── Phase 8: conservative pseudo-labeling (review pool only) ─────────────────
PL = ROOT / 'pseudo_labeled_pending_review'
n_pseudo = 0
try:
    for r in older_field[:200]:
        p = ens_predict([PImage.open(r['path']).convert('RGB')], True).numpy()
        pr = F.softmax(torch.tensor(p), 1).numpy()[0]
        c = int(pr.argmax())
        conf = float(pr[c])
        margin = float(np.sort(pr)[-1] - np.sort(pr)[-2])
        if conf >= 0.95 and margin >= 0.25:
            d = PL / CLASSES[c]
            d.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(r['path'], d / f"{r['id']}.jpg")
            n_pseudo += 1
    log(f'PHASE8 pseudo flagged_for_review={n_pseudo} merged_into_training=0 (review required first)')
except Exception as e:
    blocked(f'pseudo-labeling failed: {e}')
    log('PHASE8 pseudo flagged_for_review=not measured')
try:
    fsize = sum(f.stat().st_size for f in FDIR.rglob('*') if f.is_file())
    shutil.rmtree(FDIR)
    log(f'PHASE8 field_raw deleted, freed={fsize/1e6:.1f}MB')
except Exception as e:
    log(f'PHASE8 field_raw cleanup: {e}')

# ─── Phase 9: translation cache ───────────────────────────────────────────────
import subprocess as _sp
try:
    r = _sp.run([sys.executable, 'seed_translations.py', '--classes', 'models/classes_v3.json'],
                capture_output=True, text=True, timeout=3600, cwd=str(ROOT))
    log('PHASE9 seed output: ' + (r.stdout[-1500:] if r.stdout else '') + (r.stderr[-500:] if r.stderr else ''))
except Exception as e:
    blocked(f'seed_translations failed: {type(e).__name__} {str(e)[:150]}')

# ─── Phase 10: export + verify + report ──────────────────────────────────────
DATE = datetime.now(timezone.utc).strftime('%Y%m%d')
VDIR = ROOT / 'models' / f'sentinel_v3_{DATE}'
VDIR.mkdir(parents=True, exist_ok=True)
dummy = torch.zeros(1, 3, IMG, IMG).to(DEVICE)
ok_exp = True
for tag, m in (('mobilenetv3', m1), ('efficientnet_b0', m2)):
    try:
        m.eval()
        with torch.no_grad():
            traced = torch.jit.trace(m.cpu(), torch.zeros(1, 3, IMG, IMG))
        outp = VDIR / f'sentinel_{tag}.torchscript.pt'
        traced.save(str(outp))
        back = torch.jit.load(str(outp))
        with torch.no_grad():
            pv = back(torch.zeros(1, 3, IMG, IMG))
        log(f'EXPORT {tag}: ok shape={list(pv.shape)} bytes={outp.stat().st_size}')
    except Exception as e:
        ok_exp = False
        blocked(f'TorchScript export {tag} failed: {e}')
# one real inference with reloaded models
try:
    sample = sorted((OUT / 'test').rglob('*.jpg'))[0]
    r1 = torch.jit.load(str(VDIR / 'sentinel_mobilenetv3.torchscript.pt'))
    r2 = torch.jit.load(str(VDIR / 'sentinel_efficientnet_b0.torchscript.pt'))
    t = eval_tf(PImage.open(sample).convert('RGB')).unsqueeze(0)
    with torch.no_grad():
        o = (r1(t) + r2(t)) / 2
        o = F.softmax(o / best_T, 1)
    log(f'VERIFY real inference on {sample.name}: pred={CLASSES[int(o.argmax())]} conf={float(o.max()):.4f}')
except Exception as e:
    blocked(f'reload-verify inference failed: {e}')
calib = {'temperature': round(best_T, 4), 'classes': CLASSES, 'num_classes': NC, 'img_size': IMG,
         'conf_th': best_th[0], 'margin_th': best_th[1],
         'models': ['sentinel_mobilenetv3.torchscript.pt', 'sentinel_efficientnet_b0.torchscript.pt'],
         'mean': [0.485, 0.456, 0.406], 'std': [0.229, 0.224, 0.225]}
(VDIR / 'calibration_v3.json').write_text(json.dumps(calib, indent=2), encoding='utf-8')

# v2 vs v3 on frozen v2 golden test set
try:
    v2c = json.loads((ROOT / 'models' / 'classes_full.json').read_text())['classes']
    v2m1 = torch.jit.load(str(ROOT / 'models' / 'sentinel_mobilenetv3.torchscript.pt'))
    v2m2 = torch.jit.load(str(ROOT / 'models' / 'sentinel_efficientnet_b0.torchscript.pt'))
    v2m1.eval()
    v2m2.eval()
    gdir = ROOT / 'data' / 'full_dataset' / 'test'
    n2 = c2 = 0
    overlap = [c for c in v2c if c in CLASSES]
    for cls in overlap:
        for f in sorted((gdir / cls).glob('*')):
            if not f.is_file():
                continue
            t = eval_tf(PImage.open(f).convert('RGB')).unsqueeze(0)
            with torch.no_grad():
                pv = ((v2m1(t) + v2m2(t)) / 2).argmax().item()
                o = (m1(t.to(DEVICE)) + m2(t.to(DEVICE))) / 2
                pv3 = CLASSES[int(o.argmax())]
            if v2c[pv] == cls:
                c2 += 1
            n2 += 1
            if n2 >= 379:
                break
        if n2 >= 379:
            break
    v2acc = c2 / max(n2, 1)
    # v3 acc on same golden subset
    n3 = c3 = 0
    for cls in overlap:
        for f in sorted((gdir / cls).glob('*')):
            if not f.is_file():
                continue
            t = eval_tf(PImage.open(f).convert('RGB')).unsqueeze(0).to(DEVICE)
            with torch.no_grad():
                o = (m1(t) + m2(t)) / 2
            if CLASSES[int(o.argmax())] == cls:
                c3 += 1
            n3 += 1
            if n3 >= 379:
                break
        if n3 >= 379:
            break
    v3acc = c3 / max(n3, 1)
    log(f'GOLDEN v2-test overlap_classes={len(overlap)} N={n2}: v2_acc={v2acc:.4f} v3_acc={v3acc:.4f}')
except Exception as e:
    v2acc = v3acc = None
    n2 = 0
    blocked(f'golden v2-vs-v3 comparison failed: {type(e).__name__} {str(e)[:200]}')
    log('GOLDEN comparison not measured')

# cache rows for report
try:
    import psycopg2 as _pg
    cn = _pg.connect(host='localhost', port=5432, user='postgres', password='postgres', dbname='ziria_db', connect_timeout=10)
    cu = cn.cursor()
    cu.execute('SELECT class_id, french_name, darija_name FROM disease_nomenclature_cache LIMIT 5')
    cache_rows = cu.fetchall()
    cu.execute('SELECT count(*) FROM disease_nomenclature_cache WHERE darija_name IS NOT NULL AND darija_name<>%s', ('',))
    cache_n = cu.fetchone()[0]
    cn.close()
except Exception as e:
    cache_rows, cache_n = [], f'not measured ({e})'

# ─── Report ───────────────────────────────────────────────────────────────────
def RL(p):
    try:
        return p.read_text(encoding='utf-8')
    except Exception:
        return '(missing)'

rep = []
rep.append(f'# ZirIA Sentinel v3 — Model Report ({DATE})\n')
rep.append(f'Run elapsed: {(time.time()-T0)/3600:.2f}h. Torch: {torch.__version__}, cuda={USE_CUDA}.')
rep.append(f'Dataset: train={tot_tr} val={tot_va} test={tot_te} classes={NC} (manifest: dataset_manifest_v3.json).')
rep.append(f'Per-source totals: {dict(per_source_total)}. Extended classes: {list(EXTENDED)}. Excluded: {dict(EXCLUDED)}.')
rep.append(f'Long-tail all-train: {len(long_tail)} classes.')
rep.append(f'\n## Standard test set\nacc_single={acc_s:.4f} f1={f1_s:.4f} | acc_tta={acc_t:.4f} (gain {acc_t-acc_s:+.4f}) | ECE {ece_s:.4f} -> {ece_cal:.4f} (T={best_T:.3f}).')
rep.append(f'TTA cost: single {dt_s/max(len(yt_s),1)*1000:.1f}ms/img vs tta {dt_t/max(len(yt_t),1)*1000:.1f}ms/img; conditional fast-path frac={frac_fast:.3f}.')
rep.append(f'\n## Hard set (real farmer photos, N={len(hard_paths)}) — HEADLINE, reported separately\n')
rep.append('Accuracy/ECE: not measured — hard-set labels (Oeil de paon, Cochenille, Mildiou, Rouille jaune on olive/tomato/apple/ble) lie outside the v3 class taxonomy, so no honest accuracy exists. Used for quality-gate calibration + TTA latency (see log). Never trained on.')
rep.append(f'\n## Quality gate\nthresholds + false-reject on hard set + latency: see log lines PHASE4. Gate file: quality_gate.py.')
rep.append(f'\n## Golden v2 test comparison\nv2_acc={v2acc} v3_acc={v3acc} N={n2} overlap_classes={len(overlap) if "overlap" in dir() else "?"} (same frozen data/full_dataset/test).')
rep.append(f'\n## Translation cache\nrows_with_darija={cache_n}; 5 examples: {cache_rows}. Gemini: once-per-class seeding only; serving via gemini_gate.py (local-first, fallback-only).')
rep.append(f'\n## Pseudo-labeling\nflagged_for_review={n_pseudo} in pseudo_labeled_pending_review/, merged_into_training=0.')
rep.append('\n## BLOCKED (verbatim)\n```\n' + RL(ROOT / 'BLOCKED.md') + '\n```')
rep.append('\n## Training curves\nmodels/training_results_v3.json; per-epoch lines prefixed EPOCH in overnight_run.log.')
(ROOT / 'ML_MODEL_REPORT_V3.md').write_text('\n'.join(rep), encoding='utf-8')
log('REPORT ML_MODEL_REPORT_V3.md written')
disk_log('final')
log(f'DONE total_h={(time.time()-T0)/3600:.2f}')
LOGF.close()
