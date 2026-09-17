"""ZirIA Sentinel v3 — serving gate: local ensemble first, Gemini = true fallback only.

Serving chain:
  1. quality_gate.assess_image -> reject garbage (<10ms).
  2. Local ensemble inference. If conf >= CONF_TH and margin >= MARGIN_TH:
     resolve_darija(class_id) via disease_nomenclature_cache (ZERO Gemini calls).
  3. Else: Gemini fallback for diagnosis; if it names a new class, seed the
     cache row so the next identical case is served locally.

Integrate in backend/src/ai or ai-vision/predictor.py:
    from gemini_gate import should_fallback, resolve_darija
    if not should_fallback(conf, margin):
        darija = resolve_darija(class_id)   # local only
    else:
        darija = gemini_fallback_and_seed(...)  # only path that calls Gemini
"""
import urllib.request
import json
from datetime import datetime, timezone


def get_conn():
    import psycopg2
    return psycopg2.connect(host='localhost', port=5432, user='postgres',
                            password='postgres', dbname='ziria_db', connect_timeout=10)


def resolve_darija(class_id):
    """Local cache lookup. Returns darija_name or '' — never calls Gemini."""
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute('SELECT darija_name FROM disease_nomenclature_cache WHERE class_id=%s', (class_id,))
        row = cur.fetchone()
        conn.close()
        return (row[0] if row and row[0] else '') or ''
    except Exception:
        return ''


def should_fallback(conf, margin, conf_th=0.75, margin_th=0.15):
    return (conf < conf_th) or (margin < margin_th)


def gemini_fallback_and_seed(image_hint, candidate_classes, api_key):
    """True-fallback diagnosis via Gemini; seeds cache if a new class is named."""
    prompt = ('You are a plant pathologist. Given this crop-disease context, reply '
              f'with exactly one class id from {candidate_classes} or NEW:<name>.\n'
              f'Context: {image_hint}')
    body = json.dumps({'contents': [{'parts': [{'text': prompt}]}]}).encode()
    url = ('https://generativelanguage.googleapis.com/v1beta/models/'
           f'gemini-2.0-flash:generateContent?key={api_key}')
    req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
    answer = data['candidates'][0]['content']['parts'][0]['text'].strip()
    if answer.startswith('NEW:'):
        try:
            conn = get_conn()
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute("""INSERT INTO disease_nomenclature_cache
              (class_id, technical_name_latin, french_name, arabic_name, darija_name, generated_at)
              VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT (class_id) DO NOTHING""",
              (answer[4:].strip()[:120], '', '', '', '',
               datetime.now(timezone.utc)))
            conn.close()
        except Exception:
            pass
    return answer
