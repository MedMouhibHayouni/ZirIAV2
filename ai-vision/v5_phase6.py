"""V5 Phase 6: real HTTP chain verification (ai-vision direct). Logs to v5_run.log + v5_phase6_raw.log"""
import json, time, subprocess, sys
from pathlib import Path
from datetime import datetime, timezone
import requests
from PIL import Image
import numpy as np

ROOT = Path(__file__).parent.resolve()
LOGF = open(ROOT / 'v5_run.log', 'a', buffering=1, encoding='utf-8')
RAW = open(ROOT / 'v5_phase6_raw.log', 'w', encoding='utf-8', buffering=1)


def ts():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def log(m):
    line = f'[{ts()}] PHASE6 {m}'
    print(line, flush=True)
    LOGF.write(line + '\n')
    LOGF.flush()
    RAW.write(line + '\n')
    RAW.flush()


# 1. start file server on 8001
import http.server, threading, os
os.chdir(str(ROOT / 'data'))
handler = http.server.SimpleHTTPRequestHandler
httpd = http.server.ThreadingHTTPServer(('127.0.0.1', 8001), handler)
t = threading.Thread(target=httpd.serve_forever, daemon=True)
t.start()
log('file server on http://127.0.0.1:8001 serving data/ (test via http://127.0.0.1:8001/v5/test/...)')
time.sleep(1)

AI = 'http://127.0.0.1:8000'
BACKEND = 'http://127.0.0.1:3000'

def ai_predict(url, crop=None):
    body = {'image_url': url}
    if crop:
        body['crop_type'] = crop
    r = requests.post(f'{AI}/predict', json=body, timeout=20)
    return r.status_code, r.json()

def backend_diagnose(url, crop=None):
    try:
        r = requests.post(f'{BACKEND}/ai/diagnose', json={'image_url': url, 'crop_type': crop} if crop else {'image_url': url}, timeout=20)
        return r.status_code, r.json()
    except Exception as e:
        return None, {'error': f'{type(e).__name__}: {e}'}

# pick real images from v5 test
def pick(cls):
    p = ROOT / 'data' / 'v5' / 'test' / cls
    if not p.exists():
        return None
    imgs = sorted(p.glob('*.jpg'))
    return f'http://127.0.0.1:8001/v5/test/{cls}/{imgs[0].name}' if imgs else None

# create cochineal synthetic (white waxy spots on green) since no real dataset
syn = ROOT / 'data' / 'v5' / 'test' / 'opuntia_synth.jpg'
if not syn.exists():
    arr = np.zeros((256,256,3), dtype=np.uint8) + np.array([60,140,40], dtype=np.uint8)
    # add white clusters
    for _ in range(30):
        x,y = np.random.randint(0,256,2)
        rr, cc = np.ogrid[:256,:256]
        mask = (rr-y)**2 + (cc-x)**2 < np.random.randint(8,18)**2
        arr[mask] = [240,240,230]
    Image.fromarray(arr).save(syn)
    log(f'synthetic cochineal image created {syn}')

tests = [
    ('old1 apple_scab', pick('apple_scab'), None),
    ('old2 tom_healthy', pick('tom_healthy'), None),
    ('new1 wheat_black_point', pick('wheat_black_point'), 'wheat'),
    ('new2 olive_peacock_spot', pick('olive_peacock_spot'), 'olive'),
    ('new3 almond_damaged', pick('almond_damaged'), 'almond'),
    ('cochineal synth (opuntia)', 'http://127.0.0.1:8001/v5/test/opuntia_synth.jpg', 'opuntia'),
    ('ambiguous noise', None, None),  # will create blurry
    ('excluded raspberry_healthy (not in V5)', None, None),
]

# create ambiguous: heavily blurred + low contrast image from existing
amb = ROOT / 'data' / 'v5' / 'test' / 'ambiguous.jpg'
if not amb.exists():
    src = sorted((ROOT / 'data' / 'v5' / 'test' / 'tom_healthy').glob('*.jpg'))[0]
    im = Image.open(src).filter(Image.Filter.GaussianBlur(radius=12) if hasattr(Image, 'Filter') else Image.BOX) if False else Image.open(src).resize((32,32)).resize((256,256))
    # dark + blur
    arr = np.array(im).astype(np.float32) * 0.4 + 30
    Image.fromarray(np.clip(arr,0,255).astype(np.uint8)).save(amb)
    log(f'ambiguous image created {amb}')
tests[6] = ('ambiguous blurry tom', 'http://127.0.0.1:8001/v5/test/ambiguous.jpg', None)

# excluded: use a solid color (not a leaf) to force low confidence
exc = ROOT / 'data' / 'v5' / 'test' / 'excluded.jpg'
if not exc.exists():
    Image.new('RGB', (256,256), (120,110,100)).save(exc)
    log(f'excluded dummy created {exc}')
tests[7] = ('excluded dummy', 'http://127.0.0.1:8001/v5/test/excluded.jpg', 'raspberry')

log('TESTS prepared: ' + ', '.join(f'{n}={u}' for n,u,_ in tests))

results = []
for name, url, crop in tests:
    if not url:
        log(f'SKIP {name}: no image')
        continue
    # raw curl string for report
    curl = f"curl -s -X POST {AI}/predict -H \"Content-Type: application/json\" -d '{{\"image_url\":\"{url}\"{', \"crop_type\":\"'+crop+'\"' if crop else ''}}}'"
    RAW.write(f'\n$ {curl}\n')
    try:
        sc, js = ai_predict(url, crop)
        raw = json.dumps(js, indent=2)
        RAW.write(f'HTTP {sc}\n{raw}\n')
        src = js.get('disease_key') or js.get('disease') or '?'
        conf = js.get('confidence')
        src_field = js.get('disease_key') and 'disease_key' or 'disease'
        # check source field in predictor response: no source field, but we check simulated flag and model_version
        is_mock = js.get('simulated') == True or 'mock' in str(js.get('model_version','')).lower()
        log(f'AI {name}: HTTP {sc} source={"mock" if is_mock else "local_model"} {src_field}={js.get("disease_key") or js.get("disease")} conf={conf} needs_expert={js.get("needs_expert")} excluded={js.get("excluded_class")}')
        results.append((name, sc, js, is_mock))
    except Exception as e:
        log(f'AI {name} ERR {e}')
        RAW.write(f'ERR {e}\n')

# backend diagnose attempt (if running)
log('BACKEND diagnose attempts (if backend not running -> logged as BLOCKED)')
for name, url, crop in tests[:4]:
    if not url:
        continue
    curl = f"curl -s -X POST {BACKEND}/ai/diagnose -H \"Content-Type: application/json\" -d '{{\"image_url\":\"{url}\"}}'"
    RAW.write(f'\n$ {curl}\n')
    sc, js = backend_diagnose(url, crop)
    if sc is None:
        RAW.write(f'BACKEND NOT RUNNING: {js}\n')
        log(f'BACKEND {name}: not running ({js.get("error")})')
    else:
        raw = json.dumps(js, indent=2)
        RAW.write(f'HTTP {sc}\n{raw}\n')
        log(f'BACKEND {name}: HTTP {sc} source={js.get("source")} resolved_via={js.get("resolved_via")}')

# summary
mocks = sum(1 for _,_,_,mk in results if mk)
log(f'SUMMARY ai-vision calls={len(results)} mocks={mocks} local_model={len(results)-mocks}')
with open(ROOT / 'BLOCKED.md', 'a', encoding='utf-8') as f:
    if mocks>0:
        f.write(f'- [{ts()}] PHASE6: {mocks} responses returned mock/simulated (should be 0) — see v5_phase6_raw.log\n')
    f.write(f'- [{ts()}] PHASE6 cochineal image: synthetic (no real cochineal dataset downloadable; CactiViT verified 5958 imgs but 403-blocked). HIGH_RISK escalation seeded via NameDictionary/DiseaseKnowledge.\n')
    f.write(f'- [{ts()}] PHASE6 ambiguous/excluded: synthetic blur/dummy to exercise Gemini fallback branch; real field hard-set accuracy reported separately in calibration (hard 91.49%).\n')

log('PHASE6 DONE — see v5_phase6_raw.log for raw curl+JSON')
httpd.shutdown()
LOGF.close()
RAW.close()
