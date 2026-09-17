"""Inspect raw dataset directories and build disease-level mapping."""
import pathlib
from collections import Counter

RAW = pathlib.Path('ai-vision/data/raw')
pv_train = RAW / 'plantvillage' / 'New Plant Diseases Dataset(Augmented)' / 'New Plant Diseases Dataset(Augmented)' / 'train'
pv_valid = RAW / 'plantvillage' / 'New Plant Diseases Dataset(Augmented)' / 'New Plant Diseases Dataset(Augmented)' / 'valid'

print("=== PLANTVILLAGE CLASSES ===")
pv_dirs = sorted([d.name for d in pv_train.iterdir() if d.is_dir()])
for d in pv_dirs:
    n_tr = len(list((pv_train / d).glob('*.*')))
    n_va = len(list((pv_valid / d).glob('*.*')))
    print(f"{d:60s} train={n_tr:5d} val={n_va:5d}")

print("\n=== OLIVE CLASSES ===")
olive_dir = RAW / 'olive'
for d in sorted([x for x in olive_dir.rglob('*') if x.is_dir()]):
    imgs = list(d.glob('*.jpg')) + list(d.glob('*.png'))
    if imgs:
        print(f"{str(d.relative_to(olive_dir)):40s} imgs={len(imgs):5d}")

print("\n=== DOCTOR NABAT ===")
dn_dir = RAW / 'doctor_nabat'
for d in sorted([x for x in dn_dir.rglob('*') if x.is_dir()]):
    imgs = list(d.glob('*.jpg')) + list(d.glob('*.png'))
    if imgs:
        print(f"{str(d.relative_to(dn_dir)):40s} imgs={len(imgs):5d}")
