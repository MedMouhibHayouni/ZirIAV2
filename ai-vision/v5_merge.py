"""V5 Phase 2b: merge to DISEASE-LEVEL taxonomy. Rule-2 guard: bare crop names FAIL."""
import hashlib, io, json, shutil, random
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter, defaultdict
from PIL import Image as PImage

ROOT = Path(__file__).parent.resolve()
OUT = ROOT / 'data' / 'v5'
HARD = ROOT / 'data' / 'hard_set_v5'
LOGF = open(ROOT / 'v5_run.log', 'a', buffering=1, encoding='utf-8')
rng = random.Random(42)

V4_38 = ['apple_black_rot', 'apple_cedar_rust', 'apple_healthy', 'apple_scab', 'cherry_healthy',
         'cherry_powdery_mildew', 'corn_cercospora_leaf_spot', 'corn_common_rust', 'corn_healthy',
         'corn_northern_leaf_blight', 'grape_black_rot', 'grape_esca', 'grape_healthy', 'grape_leaf_blight',
         'olive_diseased', 'olive_healthy', 'peach_bacterial_spot', 'peach_healthy', 'pep_bacterial_spot',
         'pep_healthy', 'pot_early_blight', 'pot_healthy', 'pot_late_blight', 'raspberry_healthy',
         'soybean_healthy', 'squash_powdery_mildew', 'strawberry_healthy', 'strawberry_leaf_scorch',
         'tom_bacterial_spot', 'tom_early_blight', 'tom_healthy', 'tom_late_blight', 'tom_leaf_mold',
         'tom_mosaic_virus', 'tom_septoria_leaf_spot', 'tom_spider_mites', 'tom_target_spot',
         'tom_yellow_leaf_curl']

FR2EN = {'Cerisier_Feuille_Saine': 'cherry_healthy', 'Cerisier_Oidium': 'cherry_powdery_mildew',
         'Fraise_Brulure_foliaire': 'strawberry_leaf_scorch', 'Fraise_Feuille_Saine': 'strawberry_healthy',
         'Mais_Brulure_nord': 'corn_northern_leaf_blight', 'Mais_Feuille_Saine': 'corn_healthy',
         'Mais_Rouille_commune': 'corn_common_rust', 'Mais_Tache_cercospora': 'corn_cercospora_leaf_spot',
         'Olivier_Deficience_Nutritionnelle': 'olive_diseased', 'Olivier_Fumagine': 'olive_diseased',
         'Olivier_Virose': 'olive_diseased',
         'Peche_Feuille_Saine': 'peach_healthy', 'Peche_Tache_bacterienne': 'peach_bacterial_spot',
         'Poivron_Feuille_Saine': 'pep_healthy', 'Poivron_Tache_bacterienne': 'pep_bacterial_spot',
         'Pomme_Feuille_Saine': 'apple_healthy', 'Pomme_Pourriture_noire': 'apple_black_rot',
         'Pomme_Rouille': 'apple_cedar_rust', 'Pomme_Tavelure': 'apple_scab',
         'Pomme_de_terre_Feuille_Saine': 'pot_healthy', 'Pomme_de_terre_Mildiou_precoce': 'pot_early_blight',
         'Pomme_de_terre_Mildiou_tardif': 'pot_late_blight',
         'Raisin_Brulure_isariopsis': 'grape_leaf_blight', 'Raisin_Esca': 'grape_esca',
         'Raisin_Feuille_Saine': 'grape_healthy', 'Raisin_Pourriture_noire': 'grape_black_rot',
         'Tomate_Acarien': 'tom_spider_mites', 'Tomate_Feuille_Saine': 'tom_healthy',
         'Tomate_Mildiou_precoce': 'tom_early_blight', 'Tomate_Mildiou_tardif': 'tom_late_blight',
         'Tomate_Moisissure_foliaire': 'tom_leaf_mold', 'Tomate_Septoriose': 'tom_septoria_leaf_spot',
         'Tomate_Tache_bacterienne': 'tom_bacterial_spot', 'Tomate_Virus_mosaique': 'tom_mosaic_virus',
         'Tomate_TYLCV': 'tom_yellow_leaf_curl', 'Ble_dur_Feuille_Saine': 'wheat_healthy'}

# (base_dir, depth_of_class_dir, {dirname: class} or 'FR' or callable, source_tag, field_flag)
NEW_MAPS = {
    'wheat_khan': {'BlackPoint': 'wheat_black_point', 'FusariumFootRot': 'wheat_fusarium_foot_rot',
                   'HealthyLeaf': 'wheat_healthy', 'LeafBlight': 'wheat_leaf_blight', 'WheatBlast': 'wheat_blast'},
    'olive_tech': {'Aculus Olive': 'olive_aculus_mite', 'Healthy': 'olive_healthy',
                   'olivepeacockspot': 'olive_peacock_spot'},
    'apple_scab': {'Scab': 'apple_scab', 'Healthy': 'apple_healthy'},
    'almond': {'DAMAGED': 'almond_damaged', 'NODAMAGE': 'almond_healthy'},
    'date_hadjer': {'brown spots': 'datepalm_brown_spots', 'healthy': 'datepalm_healthy',
                    'white scale': 'datepalm_parlatoria_scale'},
    'date_yehia': {'1. Potassium Deficiency': 'datepalm_potassium_deficiency',
                   '2. Manganese Deficiency': 'datepalm_manganese_deficiency',
                   '3. Magnesium Deficiency': 'datepalm_magnesium_deficiency',
                   '4. Black Scorch': 'datepalm_black_scorch', '5. Leaf Spots': 'datepalm_leaf_spots',
                   '6. Fusarium Wilt': 'datepalm_fusarium_wilt', '7. Rachis Blight': 'datepalm_rachis_blight',
                   '8. Parlatoria Blanchardi': 'datepalm_parlatoria_scale',
                   '9. Healthy sample': 'datepalm_healthy'},
    'pv_apple': {'Apple___Apple_scab': 'apple_scab', 'Apple___Black_rot': 'apple_black_rot',
                 'Apple___Cedar_apple_rust': 'apple_cedar_rust', 'Apple___healthy': 'apple_healthy'},
}


def ts():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def log(m):
    line = f'[{ts()}] MERGE {m}'
    print(line, flush=True)
    LOGF.write(line + '\n')
    LOGF.flush()


def iter_images(base):
    base = Path(base)
    if not base.exists():
        return
    for f in base.rglob('*'):
        if f.is_file() and f.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp', '.bmp') and f.stat().st_size > 2000:
            yield f


pool = defaultdict(list)  # cls -> [(path, source, field?)]
excluded_raw = Counter()
seen = set()


def add_image(src_path, cls, source, field=False):
    try:
        with open(src_path, 'rb') as f:
            h = hashlib.sha256(f.read()).hexdigest()
    except Exception:
        return
    if h in seen:
        excluded_raw['dup:' + source] += 1
        return
    seen.add(h)
    pool[cls].append((str(src_path), source, field, h))


# A. French legacy sets
for base, tag in [('data/full_dataset', 'v2'), ('data/dataset', 'v1')]:
    for split in ('train', 'val', 'test', 'val_calib'):
        d = ROOT / base / split
        if not d.exists():
            continue
        for cdir in sorted(d.iterdir()):
            if not cdir.is_dir():
                continue
            if cdir.name == 'Ble_dur_Rouille_jaune':
                excluded_raw['no V5 wheat-rust class (counted separately)'] += sum(1 for _ in iter_images(cdir))
                continue
            cls = FR2EN.get(cdir.name)
            if cls is None:
                excluded_raw['unmapped FR:' + cdir.name] += sum(1 for _ in iter_images(cdir))
                continue
            for f in iter_images(cdir):
                add_image(f, cls, tag, field=False)

# B. pv_raw apples (folder names = truth)
pv = ROOT / 'data' / 'pv_raw' / 'color'
if pv.exists():
    for cdir in sorted(pv.iterdir()):
        if not cdir.is_dir():
            continue
        cls = NEW_MAPS['pv_apple'].get(cdir.name)
        if cls is None:
            continue
        for f in iter_images(cdir):
            add_image(f, cls, 'pv_apple', field=False)

# C. raw_v5 new sources (find class dir at any depth by dirname match)
RV = ROOT / 'data' / 'raw_v5'
FIELD_SRC = {'date_hadjer', 'date_yehia', 'almond'}
for src, mapping in NEW_MAPS.items():
    if src == 'pv_apple':
        continue
    base = RV / src
    if not base.exists():
        log(f'src {src} missing')
        continue
    # collect dirs whose NAME matches a mapping key
    hits = defaultdict(list)
    for d in [base] + [p for p in base.rglob('*') if p.is_dir()]:
        if d.name in mapping:
            hits[d.name].append(d)
    # prefer deepestazor? use all matches but prefer the SHALLOWEST set that covers images
    for key, dirs in hits.items():
        # choose dir(s): if nested duplicates (hadjer), take the deepest level only
        depths = sorted({len(d.relative_to(base).parts) for d in dirs})
        use = [d for d in dirs if len(d.relative_to(base).parts) == depths[-1]]
        for d in use:
            for f in iter_images(d):
                # avoid double-count when a parent match dir contains a child match dir of SAME class
                add_image(f, mapping[key], src, field=(src in FIELD_SRC))

# D. barley check
bar = RV / 'barley_seg'
n_bar = sum(1 for _ in iter_images(bar)) if bar.exists() else 0
log(f'barley images total={n_bar} (need >=30 + RGB leaf photos; decided below)')

# class rollup BEFORE hard holdout
log(f'pooled classes={len(pool)} total={sum(len(v) for v in pool.values())}')
for c in sorted(pool):
    log(f'POOL {c}: {len(pool[c])}')

# E. hard set: existing 6 + field-condition picks from new crops (never trained)
if HARD.exists():
    shutil.rmtree(HARD)
HARD.mkdir(parents=True, exist_ok=True)
import csv
h_old = ROOT / 'data' / 'dataset' / 'hard_field'
n_hard = 0
with open(HARD / 'labels.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['file', 'class', 'source'])
    if h_old.exists():
        for img in iter_images(h_old):
            rel = img.relative_to(h_old).parts
            cls = FR2EN.get(rel[0], 'UNMAPPED_' + rel[0])
            dst = HARD / f'old_{n_hard}.jpg'
            shutil.copyfile(img, dst)
            w.writerow([dst.name, cls, 'v1_hard_field'])
            n_hard += 1
    for cls in sorted(pool):
        fld = [(p, s, h) for (p, s, fl, h) in pool[cls] if fl]
        if not fld:
            continue
        k = min(12, max(3, len(fld) // 10))
        for (p, s, h) in rng.sample(fld, min(k, len(fld))):
            dst = HARD / f'new_{n_hard}.jpg'
            shutil.copyfile(p, dst)
            w.writerow([dst.name, cls, s])
            n_hard += 1
            pool[cls] = [(pp, ss, ff, hh) for (pp, ss, ff, hh) in pool[cls] if hh != h]
log(f'HARDSET n={n_hard} (never trained on)')

# F. finalize classes (>=30), Rule-2 guard
BARE = {'tomato', 'potato', 'olive', 'wheat', 'pepper', 'apple', 'corn', 'grape', 'peach',
        'cherry', 'strawberry', 'squash', 'soybean', 'raspberry', 'healthy',
        'almond', 'pistachio', 'pomegranate', 'fig', 'date', 'datepalm', 'barley', 'opuntia'}
final = sorted([c for c in pool if len(pool[c]) >= 30])
dropped = {c: len(pool[c]) for c in pool if len(pool[c]) < 30}
bad = [c for c in final if c.lower() in BARE]
if bad:
    log(f'RULE2 VIOLATION — bare crop names in final list: {bad}; ABORT')
    LOGF.close()
    raise SystemExit('RULE2 abort')
missing_old = [c for c in V4_38 if c not in final]
log(f'FINAL classes={len(final)} dropped_low_data={dropped}')
log(f'OLD38 missing from V5 servable: {missing_old}')
log(f'OLD38 retained: {len(V4_38)-len(missing_old)}/38')

# G. stratified 70/15/15 split + write
if OUT.exists():
    shutil.rmtree(OUT)
split_counts = defaultdict(Counter)
per_source = defaultdict(Counter)
samples = defaultdict(list)
for cls in final:
    items = pool[cls][:]
    rng.shuffle(items)
    n = len(items)
    nv = max(1, int(n * 0.15))
    nt = max(1, int(n * 0.15))
    ntr = n - nv - nt
    for i, (p, s, fl, h) in enumerate(items):
        sp = 'train' if i < ntr else ('val' if i < ntr + nv else 'test')
        d = OUT / sp / cls
        d.mkdir(parents=True, exist_ok=True)
        try:
            im = PImage.open(p).convert('RGB').resize((256, 256), PImage.BILINEAR)
            fn = f'{s}_{split_counts[sp][cls]:06d}.jpg'
            im.save(d / fn, quality=85)
            split_counts[sp][cls] += 1
            per_source[s][cls] += 1
            if len(samples[s]) < 60:
                samples[s].append(str(d / fn))
        except Exception:
            continue
tot = {s: sum(split_counts[s].values()) for s in ('train', 'val', 'test')}
log(f'SPLIT {tot} classes={len(final)}')

import random as _r
_r2 = _r.Random(7)
checks = {}
for s, paths in samples.items():
    checks[s] = []
    for p in _r2.sample(paths, min(20, len(paths))):
        try:
            h = hashlib.sha256()
            with open(p, 'rb') as f:
                h.update(f.read())
            checks[s].append({'file': Path(p).name, 'sha256': h.hexdigest()})
        except Exception:
            pass
manifest = {'generated_at': ts(), 'final_classes': final, 'n_classes': len(final),
            'old38_retained': [c for c in V4_38 if c in final],
            'old38_missing': missing_old,
            'dropped_low_data': dropped,
            'split_totals': tot, 'split_per_class': {s: dict(split_counts[s]) for s in split_counts},
            'per_source_class': {s: dict(per_source[s]) for s in per_source},
            'hard_set_n': n_hard, 'rule2_guard': 'pass: no bare crop names',
            'sha256_20_per_source': checks,
            'notes': ['almond_damaged = mechanical/damage detection, not pathogen (kept, flagged)',
                      'datepalm deficiencies = nutrient disorders (kept as conditions, flagged)',
                      'hadjer white scale + yehia Parlatoria Blanchardi merged (same pest)',
                      'v4_blend (15 crop-level labels) EXCLUDED from disease training',
                      'opuntia: 0 images, classes not created; treatment content in Phase 5']}
(ROOT / 'dataset_manifest_v5.json').write_text(json.dumps(manifest, indent=2))
log('WROTE dataset_manifest_v5.json')
LOGF.close()
