"""V5 unzip all + JIC wheat retry. Logs to v5_run.log."""
import time, urllib.request, zipfile, shutil
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter

ROOT = Path(__file__).parent.resolve()
D = ROOT / 'data' / 'raw_v5'
LOGF = open(ROOT / 'v5_run.log', 'a', buffering=1, encoding='utf-8')


def ts():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def log(m):
    line = f'[{ts()}] UNZIP {m}'
    print(line, flush=True)
    LOGF.write(line + '\n')
    LOGF.flush()


# JIC wheat: VERIFIED REAL (999 imgs, JIC, CC-BY) but zenodo file content is HTTP 403
# from this machine on every URL form (metadata API works). Excluded; khanaamer covers wheat.
log('JIC SKIPPED: verified-real but file download 403-blocked; see BLOCKED.md')
with open(ROOT / 'BLOCKED.md', 'a', encoding='utf-8') as _bf:
    _bf.write(f'- [{ts()}] JIC wheat (zenodo 7573133): metadata verified (999 imgs, yellow/brown rust, '
              'septoria, mildew, healthy, CC-BY-4.0) but ALL file-download URL forms return HTTP 403 '
              'from this host. Excluded from V5; wheat covered by khanaamer Kaggle set.\n')

# junk cleanup
for j in [D / 'cactivit.zip', D / 'wheat_jic.zip']:
    if j.exists():
        j.unlink()
        log(f'junk removed {j.name}')

# unzip all
for sub in sorted(D.iterdir()):
    if not sub.is_dir():
        continue
    for z in sorted(sub.glob('*.zip')):
        try:
            with zipfile.ZipFile(z) as zf:
                bad = zf.testzip()
                if bad is not None:
                    log(f'{sub.name}/{z.name}: CORRUPT at {bad}; skip')
                    continue
                zf.extractall(sub)
            log(f'{sub.name}/{z.name}: extracted')
        except Exception as e:
            log(f'{sub.name}/{z.name}: extract FAIL {type(e).__name__} {str(e)[:120]}')

# inventory with class dirs
inv = {}
for sub in sorted(D.iterdir()):
    if not sub.is_dir() or sub.name in ('cactivit_git',):
        continue
    imgs = [f for f in sub.rglob('*') if f.is_file() and f.suffix.lower() in
            ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff') and f.stat().st_size > 2000]
    per1 = Counter()
    for f in imgs:
        rel = f.relative_to(sub).parts
        per1[rel[0] if len(rel) > 1 else '_root'] += 1
    inv[sub.name] = {'images': len(imgs), 'dir1': dict(sorted(per1.items()))}
    log(f'INV {sub.name}: images={len(imgs)}')
(ROOT / 'v5_unzip_inventory.json').write_text(__import__('json').dumps(inv, indent=2))
log('WROTE v5_unzip_inventory.json')
LOGF.close()
