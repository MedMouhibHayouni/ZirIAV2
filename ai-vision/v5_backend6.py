"""V5 follow-up Phase 6 backend re-run: 8 tests via /ai/diagnose, confirm resolved_via + HIGH_RISK."""
import json, time, requests
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).parent.resolve()
LOGF = open(ROOT / 'v5_run.log', 'a', buffering=1, encoding='utf-8')
RAW = open(ROOT / 'v5_phase6_backend_raw.log', 'w', encoding='utf-8', buffering=1)
BACKEND = 'http://127.0.0.1:3000'
AI = 'http://127.0.0.1:8000'

def ts(): return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
def log(m):
    line=f'[{ts()}] BACKEND6 {m}'
    print(line, flush=True); LOGF.write(line+'\n'); LOGF.flush(); RAW.write(line+'\n'); RAW.flush()

# pickers
def url_for(cls, idx=0):
    p = ROOT/'data'/'v5'/'test'/cls
    imgs = sorted(p.glob('*.jpg'))
    if not imgs: return None
    return f'http://127.0.0.1:8001/v5/test/{cls}/{imgs[idx].name}'

tests = [
    ('old1 apple_scab', url_for('apple_scab'), None),
    ('old2 tom_healthy', url_for('tom_healthy'), None),
    ('new1 wheat_black_point', url_for('wheat_black_point'), 'wheat'),
    ('new2 olive_peacock_spot', url_for('olive_peacock_spot'), 'olive'),
    ('new3 almond_damaged', url_for('almond_damaged'), 'almond'),
    ('opuntia synth HIGH_RISK', 'http://127.0.0.1:8001/v5/test/opuntia_synth.jpg', 'opuntia'),
    ('ambiguous blurry', 'http://127.0.0.1:8001/v5/test/ambiguous.jpg', None),
    ('excluded dummy', 'http://127.0.0.1:8001/v5/test/excluded.jpg', 'raspberry'),
    # extra thin HIGH_RISK checks
    ('thin corn_cercospora', url_for('corn_cercospora_leaf_spot'), 'corn'),
    ('thin tom_mosaic', url_for('tom_mosaic_virus'), 'tomato'),
]

# also direct AI checks for source verification
for name, url, crop in tests:
    if not url: 
        log(f'SKIP {name}: no image')
        continue
    # Backend diagnose
    body = {'image_url': url}
    if crop: body['crop_type'] = crop
    curl = f"curl -s -X POST {BACKEND}/ai/diagnose -H \"Content-Type: application/json\" -d '{json.dumps(body)}'"
    RAW.write(f'\n$ {curl}\n')
    try:
        r = requests.post(f'{BACKEND}/ai/diagnose', json=body, timeout=25)
        sc = r.status_code
        js = r.json()
        raw = json.dumps(js, indent=2, ensure_ascii=False)
        RAW.write(f'HTTP {sc}\n{raw}\n')
        # VisionResult fields: source, resolved_via, requires_expert_validation, disease_key etc
        # Backend wraps in SentinelReport: check vision.source? Actually diagnose returns VisionResult directly? Check ai.controller: diagnose returns this.aiService.diagnoseDirect which returns VisionResult
        # VisionResult has source and resolved_via
        src = js.get('source') or js.get('vision',{}).get('source') or '?'
        via = js.get('resolved_via') or js.get('vision',{}).get('resolved_via') or '?'
        dk = js.get('disease_key') or js.get('vision',{}).get('disease_key') or js.get('disease') or '?'
        conf = js.get('confidence') or js.get('vision',{}).get('confidence')
        needs = js.get('requires_expert_validation')
        # For opuntia, check HIGH_RISK escalation
        is_mock = src == 'mock'
        log(f'BACKEND {name}: HTTP {sc} source={src} via={via} key={dk} conf={conf} needs_expert={needs} mock={is_mock}')
        if is_mock:
            RAW.write('*** MOCK DETECTED ***\n')
    except Exception as e:
        log(f'BACKEND {name} ERR {type(e).__name__} {e}')
        RAW.write(f'ERR {e}\n')
    time.sleep(0.5)
    # Also direct AI for comparison
    try:
        r2 = requests.post(f'{AI}/predict', json=body, timeout=20)
        js2 = r2.json()
        log(f'  AI direct {name}: key={js2.get("disease_key")} conf={js2.get("confidence")} needs={js2.get("needs_expert")} model={js2.get("model_version")}')
    except Exception as e:
        log(f'  AI direct {name} ERR {e}')

log('BACKEND6 DONE')
# also check opuntia HIGH_RISK specifically
try:
    r = requests.post(f'{BACKEND}/ai/diagnose', json={'image_url': 'http://127.0.0.1:8001/v5/test/opuntia_synth.jpg', 'crop_type': 'opuntia'}, timeout=20)
    js = r.json()
    # Check if escalated
    via = js.get('resolved_via') or js.get('vision',{}).get('resolved_via')
    needs = js.get('requires_expert_validation')
    if via == 'expert_escalation' and needs == True:
        log('OPUNTIA HIGH_RISK CHECK: PASS — synthetic opuntia correctly escalated to expert (via=expert_escalation, needs_expert=True)')
    else:
        log(f'OPUNTIA HIGH_RISK CHECK: FAIL — via={via} needs={needs} (expected expert_escalation)')
except Exception as e:
    log(f'OPUNTIA check ERR {e}')

LOGF.close(); RAW.close()
