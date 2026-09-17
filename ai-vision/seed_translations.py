"""ZirIA Sentinel v3 — Darija translation cache seeder (Gemini called ONCE per class).

Table: disease_nomenclature_cache(class_id PK, technical_name_latin,
french_name, arabic_name, darija_name, generated_at).
Rerun-safe: skips classes that already have a darija_name.
Usage: python seed_translations.py [--classes classes.json] [--limit N]
"""
import argparse
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BACKEND_ENV = Path(__file__).resolve().parent.parent / 'backend' / '.env'


def load_env_key(name):
    try:
        for line in BACKEND_ENV.read_text(errors='replace').splitlines():
            if line.startswith(name + '='):
                return line.split('=', 1)[1].strip()
    except Exception:
        pass
    return None


def get_conn():
    import psycopg2
    return psycopg2.connect(host='localhost', port=5432, user='postgres',
                            password='postgres', dbname='ziria_db', connect_timeout=10)


DDL = """CREATE TABLE IF NOT EXISTS disease_nomenclature_cache (
  class_id VARCHAR(120) PRIMARY KEY,
  technical_name_latin TEXT,
  french_name TEXT,
  arabic_name TEXT,
  darija_name TEXT,
  generated_at TIMESTAMPTZ DEFAULT now()
)"""


def latin_guess(class_id):
    m = re.match(r'(.+?)_(.+)', class_id)
    if not m:
        return class_id
    return f'{m.group(1)} sp. — {m.group(2).replace("_", " ")}'


def french_guess(class_id):
    return class_id.replace('_', ' ')


def gemini_darija(class_id, french, api_key, model='gemini-2.0-flash'):
    prompt = ('Translate this plant disease name to Tunisian Darija (Arabic script, '
              'short, farmer-friendly, 1-3 words). Reply with ONLY the translation.\n'
              f'Disease: {french} ({class_id})')
    body = json.dumps({'contents': [{'parts': [{'text': prompt}]}]}).encode()
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}'
    req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
    try:
        return data['candidates'][0]['content']['parts'][0]['text'].strip().splitlines()[0][:200]
    except Exception:
        return ''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--classes', default='models/classes_full.json')
    ap.add_argument('--limit', type=int, default=1000)
    ap.add_argument('--no-gemini', action='store_true')
    args = ap.parse_args()

    with open(args.classes, encoding='utf-8') as f:
        raw = json.load(f)
    classes = raw['classes'] if isinstance(raw, dict) and 'classes' in raw else raw
    conn = get_conn()
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(DDL)
    keys = [k for k in ('GOOGLE_GEMINI_API_KEY', 'GOOGLE_GEMINI_API_KEYMMH',
                        'GOOGLE_GEMINI_API_KEYMMHAYOUNI', 'GOOGLE_GEMINI_API_KEYAiKup')
            if load_env_key(k)]
    api_key = load_env_key(keys[0]) if keys else None
    made, skipped, failed = 0, 0, 0
    for cid in classes[:args.limit]:
        cur.execute('SELECT darija_name FROM disease_nomenclature_cache WHERE class_id=%s', (cid,))
        row = cur.fetchone()
        if row and row[0]:
            skipped += 1
            continue
        darija = ''
        if api_key and not args.no_gemini:
            try:
                darija = gemini_darija(cid, french_guess(cid), api_key)
                made += 1
            except Exception as e:
                print(f'  GEMINI_FAIL {cid}: {type(e).__name__}', flush=True)
                failed += 1
        else:
            failed += 1
        now = datetime.now(timezone.utc)
        cur.execute("""INSERT INTO disease_nomenclature_cache
          (class_id, technical_name_latin, french_name, arabic_name, darija_name, generated_at)
          VALUES (%s,%s,%s,%s,%s,%s)
          ON CONFLICT (class_id) DO UPDATE SET
            technical_name_latin=EXCLUDED.technical_name_latin,
            french_name=EXCLUDED.french_name,
            darija_name=CASE WHEN disease_nomenclature_cache.darija_name IS NULL
                             OR disease_nomenclature_cache.darija_name=''
                             THEN EXCLUDED.darija_name ELSE disease_nomenclature_cache.darija_name END,
            generated_at=EXCLUDED.generated_at""",
            (cid, latin_guess(cid), french_guess(cid), '', darija, now))
    print(f'CACHE_SEED done: gemini_calls={made} skipped={skipped} failed_or_empty={failed}', flush=True)
    cur.execute('SELECT class_id, french_name, darija_name FROM disease_nomenclature_cache LIMIT 5')
    for r in cur.fetchall():
        print('CACHE_ROW:', r, flush=True)
    conn.close()


if __name__ == '__main__':
    sys.exit(main())
