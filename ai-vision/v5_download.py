"""V5 Phase 2a: BULK downloads only, 30-min cap per source. Logs to v5_run.log + BLOCKED.md."""
import os, sys, json, time, shutil, subprocess, base64, zipfile
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).parent.resolve()
os.chdir(ROOT)
RAW5 = ROOT / 'data' / 'raw_v5'
RAW5.mkdir(parents=True, exist_ok=True)
LOGF = open(ROOT / 'v5_run.log', 'a', buffering=1, encoding='utf-8')
BUDGET = 1800


def ts():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def log(m):
    line = f'[{ts()}] {m}'
    print(line, flush=True)
    LOGF.write(line + '\n')
    LOGF.flush()


def blocked(m):
    p = ROOT / 'BLOCKED.md'
    if not p.exists():
        p.write_text('# V5 blocked / honest gaps\n\n', encoding='utf-8')
    with open(p, 'a', encoding='utf-8') as f:
        f.write(f'- [{ts()}] {m}\n')
    log('BLOCKED: ' + m)


# Mendeley: no programmatic bulk access (JS-only download, API needs token)
for mid, title in [('5gc7hwydwg/1', 'wheat'), ('9zgkwwv9j8/4', 'apple'), ('b6s2rkpmvh/1', 'pomegranate'),
                   ('f7dk2yknff/2', 'fig'), ('g684ghfxvg/2', 'date palm'), ('8nzpnwkncp/1', 'barley'),
                   ('jgt7ghdmg5/1', 'cactus/sidi bouzid')]:
    blocked(f'Mendeley {mid} ({title}): verified real but NO programmatic bulk download '
            '(JS-only Download-All, public API needs token). Excluded from V5 bulk pipeline.')
blocked('HyperPistachio (zenodo 14213013/20027441): verified real but hyperspectral NUT cubes '
        '(aflatoxin nuts, .mat-style), wrong modality+organ for RGB leaf-photo classifier. Excluded.')
blocked('Figshare OQDS-Insight: verified real but GIS shapefiles (.shp/.dbf points), no leaf photos. Excluded.')


def curl_resume(url, dest, tag):
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    r = subprocess.run(['curl.exe', '-L', '-C', '-', '--retry', '5', '--retry-all-errors',
                        '-m', str(BUDGET), '-A', 'Mozilla/5.0', '-o', str(dest), url],
                       capture_output=True, text=True, timeout=BUDGET + 60)
    dt = time.time() - t0
    ok = dest.exists() and dest.stat().st_size > 1_000_000
    log(f'{tag}: rc={r.returncode} t={dt:.0f}s bytes={dest.stat().st_size if dest.exists() else 0} ok={ok} err={(r.stderr or "")[-150:]}')
    return ok


def git_clone(url, dest, tag):
    dest = Path(dest)
    if dest.exists():
        log(f'{tag}: exists, reuse')
        return True
    t0 = time.time()
    try:
        r = subprocess.run(['git', 'clone', '--depth', '1', url, str(dest)],
                           capture_output=True, text=True, timeout=BUDGET)
        log(f'{tag}: rc={r.returncode} t={time.time()-t0:.0f}s err={(r.stderr or "")[-200:]}')
        return r.returncode == 0
    except subprocess.TimeoutExpired:
        blocked(f'{tag}: git clone exceeded 30-min budget')
        shutil.rmtree(dest, ignore_errors=True)
        return False


def kaggle_resume(slug, dest_dir, tag, tries=60):
    try:
        kj = json.loads(Path(os.path.expanduser('~/.kaggle/kaggle.json')).read_text())
    except Exception as e:
        blocked(f'{tag}: kaggle.json unreadable: {e}')
        return False
    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    zp = dest_dir / (slug.replace('/', '_') + '.zip')
    if zp.exists() and zp.stat().st_size > 10_000_000:
        log(f'{tag}: zip exists ({zp.stat().st_size/1e9:.2f}G), skip')
        return True
    creds = base64.b64encode(f"{kj['username']}:{kj['key']}".encode()).decode()
    url = f'https://www.kaggle.com/api/v1/datasets/download/{slug}'
    part = zp.with_suffix('.zip.part')
    import urllib.request
    t0 = time.time()
    for a in range(tries):
        if time.time() - t0 > BUDGET:
            blocked(f'{tag}: 30-min budget hit at {part.stat().st_size/1e6:.0f}MB partial')
            return False
        try:
            have = part.stat().st_size if part.exists() else 0
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0',
                                                       'Authorization': f'Basic {creds}'})
            if have:
                req.add_header('Range', f'bytes={have}-')
            with urllib.request.urlopen(req, timeout=90) as r:
                mode = 'ab' if (have and r.status != 200) else 'wb'
                with open(part, mode) as f:
                    while True:
                        ch = r.read(1 << 20)
                        if not ch:
                            break
                        f.write(ch)
            part.rename(zp)
            log(f'{tag}: DONE bytes={zp.stat().st_size} t={time.time()-t0:.0f}s')
            return True
        except Exception as e:
            time.sleep(10)
    blocked(f'{tag}: failed after {tries} tries')
    return False


# 1. CactiViT (priority)
if not git_clone('https://github.com/AnasBerka/CactiViT-materials.git', RAW5 / 'cactivit', 'CACTIVIT_CLONE'):
    blocked('CactiViT git clone failed; trying codeload zip')
    curl_resume('https://codeload.github.com/AnasBerka/CactiViT-materials/zip/refs/heads/master',
                RAW5 / 'cactivit.zip', 'CACTIVIT_ZIP')
# LFS check
try:
    import collections
    lfs = 0
    tot = 0
    for f in (RAW5 / 'cactivit').rglob('*'):
        if f.is_file() and f.suffix.lower() in ('.jpg', '.jpeg', '.png'):
            tot += 1
            with open(f, 'rb') as fh:
                if fh.read(20).startswith(b'version https://git-lfs'):
                    lfs += 1
    log(f'CACTIVIT images={tot} lfs_pointers={lfs}')
    if tot > 0 and lfs == tot:
        blocked('CactiViT images are Git-LFS pointers; attempting git lfs pull')
        r = subprocess.run(['git', 'lfs', 'pull'], capture_output=True, text=True, timeout=BUDGET,
                           cwd=str(RAW5 / 'cactivit'))
        log(f'LFS pull rc={r.returncode} err={(r.stderr or "")[-200:]}')
except Exception as e:
    log(f'CACTIVIT LFS check: {e}')

# 2. Wheat JIC zenodo (1.03GB zip)
curl_resume('https://zenodo.org/api/records/7573133/files/Long%202023%20Plant%20Path%20999%20photos.zip/content',
            RAW5 / 'wheat_jic.zip', 'WHEAT_JIC')

# 3-7. Kaggle bulks
for slug, tag in [('khanaamer/wheat-leaf-disease-dataset', 'WHEAT_KHAN'),
                  ('techplusmentor/olive-leaf-disease-datasets', 'OLIVE_TECH'),
                  ('projectlzp201910094/applescabfds', 'APPLE_SCAB'),
                  ('mahyeks/almond-damage-detection', 'ALMOND'),
                  ('hadjerhamaidi/date-palm-data', 'DATE_HADJER'),
                  ('yehiaheshamelgharib/processed-infected-date-palm-leaves-dataset-v1', 'DATE_YEHIA')]:
    kaggle_resume(slug, RAW5 / tag.lower(), tag)

# 8. Barley github
git_clone('https://github.com/grimmlab/BarleyDiseaseSegmentation.git', RAW5 / 'barley_seg', 'BARLEY_GIT')

# 9. Almond UPV: discover bitstreams
try:
    r = subprocess.run(['curl.exe', '-s', '-m', '60', '-A', 'Mozilla/5.0',
                        'https://riunet.upv.es/items/cf811d7a-7aae-4a8d-98ec-bd974b938db6/'],
                       capture_output=True, text=True, timeout=90)
    import re
    links = sorted(set(re.findall(r'(?:/bitstreams?/|/bitstream/)[^"\s<>]+', r.stdout)))
    log(f'UPV bitstream links found: {len(links)} sample={[l[:100] for l in links[:5]]}')
    (ROOT / 'v5_upv_links.json').write_text(json.dumps(links, indent=2))
    if not links:
        blocked('UPV NEW4ALMOND: item page reachable but no direct bitstream links extractable; needs interactive DSpace UI')
except Exception as e:
    blocked(f'UPV discovery failed: {e}')

# inventory
inv = {}
for d in sorted(RAW5.iterdir()):
    try:
        if d.is_file():
            inv[d.name] = {'bytes': d.stat().st_size, 'type': 'file'}
            continue
        n_img = sum(1 for f in d.rglob('*') if f.is_file() and f.suffix.lower() in
                    ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff'))
        n_all = sum(1 for _ in d.rglob('*') if _.is_file())
        tops = sorted({p.relative_to(d).parts[0] for p in d.rglob('*') if p.is_file() and len(p.relative_to(d).parts) > 1})[:25]
        inv[d.name] = {'images': n_img, 'files': n_all, 'top_dirs': tops}
        log(f'INV {d.name}: images={n_img} files={n_all}')
    except Exception as e:
        inv[d.name] = {'err': str(e)[:100]}
(ROOT / 'v5_dl_inventory.json').write_text(json.dumps(inv, indent=2))
log('WROTE v5_dl_inventory.json')
try:
    u = shutil.disk_usage(str(ROOT))
    log(f'DISK post-dl: free={u.free/1e9:.1f}G')
except Exception:
    pass
log('PHASE2A DONE')
LOGF.close()
