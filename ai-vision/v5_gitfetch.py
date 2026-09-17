"""V5 CactiViT via accumulating git fetch (objects persist across retries)."""
import subprocess, time
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).parent.resolve()
D = ROOT / 'data' / 'raw_v5' / 'cactivit_git'
LOGF = open(ROOT / 'v5_run.log', 'a', buffering=1, encoding='utf-8')


def ts():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def log(m):
    line = f'[{ts()}] GITFETCH {m}'
    print(line, flush=True)
    LOGF.write(line + '\n')
    LOGF.flush()


def sh(cmd, timeout=1500):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, cwd=str(D))


D.mkdir(parents=True, exist_ok=True)
if not (D / '.git').exists():
    sh(['git', 'init'])
    sh(['git', 'remote', 'add', 'origin', 'https://github.com/AnasBerka/CactiViT-materials.git'])
    sh(['git', 'config', 'core.compression', '0'])
ok = False
for a in range(25):
    try:
        r = sh(['git', 'fetch', '--depth', '1', 'origin', 'master'])
        tail = (r.stderr or '')[-150:]
        log(f'fetch attempt={a} rc={r.returncode} {tail}')
        if r.returncode == 0:
            ok = True
            break
    except subprocess.TimeoutExpired:
        log(f'fetch attempt={a} TIMEOUT 25min')
    time.sleep(10)
if ok:
    r = sh(['git', 'checkout', 'FETCH_HEAD', '--', 'Datasets'])
    log(f'checkout rc={r.returncode} {(r.stderr or "")[-150:]}')
    n = sum(1 for f in (D / 'Datasets').rglob('*') if f.is_file() and f.suffix.lower() in ('.jpg', '.jpeg', '.png'))
    log(f'CACTIVIT images on disk: {n}')
else:
    log('CACTIVIT fetch FAILED after 25 tries')
LOGF.close()
