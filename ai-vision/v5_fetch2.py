"""V5 fetch-2: resumable urllib download for CactiViT codeload + JIC wheat zip."""
import time, urllib.request
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).parent.resolve()
LOGF = open(ROOT / 'v5_run.log', 'a', buffering=1, encoding='utf-8')


def ts():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def log(m):
    line = f'[{ts()}] FETCH2 {m}'
    print(line, flush=True)
    LOGF.write(line + '\n')
    LOGF.flush()


def fetch(url, dest, tries=200):
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    part = dest.with_name(dest.name + '.part')
    consec200 = 0
    for a in range(tries):
        try:
            have = part.stat().st_size if part.exists() else 0
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            if have:
                req.add_header('Range', f'bytes={have}-')
            with urllib.request.urlopen(req, timeout=90) as r:
                if have and r.status == 200:
                    consec200 += 1
                    if consec200 < 6:
                        raise IOError(f'server ignored Range (200), keep partial, retry ({consec200})')
                    log(f'{dest.name}: server keeps ignoring Range; restarting from 0')
                    consec200 = 0
                    mode = 'wb'
                else:
                    consec200 = 0
                    mode = 'ab' if have else 'wb'
                with open(part, mode) as f:
                    while True:
                        ch = r.read(1 << 20)
                        if not ch:
                            break
                        f.write(ch)
            part.rename(dest)
            log(f'DONE {dest.name} bytes={dest.stat().st_size}')
            return True
        except Exception as e:
            have = part.stat().st_size if part.exists() else 0
            if a % 10 == 0:
                log(f'{dest.name} attempt={a} {type(e).__name__} have={have/1e6:.0f}MB')
            time.sleep(8)
    log(f'FAILED {dest.name}')
    return False


D = ROOT / 'data' / 'raw_v5'
ok1 = fetch('https://codeload.github.com/AnasBerka/CactiViT-materials/zip/refs/heads/master',
            D / 'cactivit_master.zip')
ok2 = fetch('https://zenodo.org/api/records/7573133/files/Long%202023%20Plant%20Path%20999%20photos.zip/content',
            D / 'wheat_jic2.zip')
if ok1:
    import zipfile
    try:
        with zipfile.ZipFile(D / 'cactivit_master.zip') as z:
            names = z.namelist()
            imgs = [n for n in names if n.lower().endswith(('.jpg', '.jpeg', '.png'))]
            from collections import Counter
            top = Counter(n.split('/')[1] + '/' + n.split('/')[2] if len(n.split('/')) > 3 else n.split('/')[1]
                          for n in imgs if len(n.split('/')) > 1)
            log(f'CACTIVIT zip entries={len(names)} images={len(imgs)} folders={dict(top)}')
            z.extractall(D / 'cactivit')
            log('CACTIVIT extracted')
    except Exception as e:
        log(f'CACTIVIT zip bad: {e}')
if ok2:
    import zipfile
    try:
        with zipfile.ZipFile(D / 'wheat_jic2.zip') as z:
            names = z.namelist()
            imgs = [n for n in names if n.lower().endswith(('.jpg', '.jpeg', '.png'))]
            from collections import Counter
            top = Counter(n.split('/')[0] + (('/' + n.split('/')[1]) if len(n.split('/')) > 2 else '')
                          for n in names if len(n.split('/')) > 0)
            log(f'JIC zip entries={len(names)} images={len(imgs)} top={dict(list(top.items())[:12])}')
    except Exception as e:
        log(f'JIC zip bad: {e}')
log('FETCH2 DONE')
LOGF.close()
