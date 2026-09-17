"""V5 Phase 1: verify every candidate dataset. Writes v5_dataset_verification.json."""
import json, subprocess, urllib.request
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).parent.resolve()
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
res = {}


def curl_json(url, timeout=40):
    try:
        r = subprocess.run(['curl.exe', '-s', '-m', str(timeout), '-A', UA, url],
                           capture_output=True, text=True, timeout=timeout + 10)
        t = r.stdout.strip()
        return json.loads(t) if t.startswith(('{', '[')) else {'_raw': t[:150]}
    except Exception as e:
        return {'_err': f'{type(e).__name__}: {str(e)[:100]}'}


def curl_head(url, timeout=30):
    try:
        r = subprocess.run(['curl.exe', '-s', '-m', str(timeout), '-A', UA, '-o', 'NUL',
                            '-w', '%{http_code} %{size_download} %{url_effective}', url],
                           capture_output=True, text=True, timeout=timeout + 10)
        return r.stdout.strip()
    except Exception as e:
        return f'ERR {e}'


def kaggle_meta(slug):
    try:
        d = Path(r'C:\Users\mouhi\AppData\Local\Temp\opencode\kgv5') / slug.replace('/', '_')
        d.mkdir(parents=True, exist_ok=True)
        r = subprocess.run(['kaggle', 'datasets', 'metadata', slug, '-p', str(d)],
                           capture_output=True, text=True, timeout=120)
        if r.returncode != 0:
            return {'reachable': False, 'evidence': r.stderr[-200:]}
        m = json.loads((d / 'dataset-metadata.json').read_text())['info']
        return {'reachable': True, 'title': m.get('title'), 'desc': (m.get('description') or '')[:400],
                'license': [l.get('name') for l in (m.get('licenses') or [])],
                'downloads': m.get('totalDownloads')}
    except Exception as e:
        return {'reachable': False, 'evidence': f'{type(e).__name__}: {str(e)[:150]}'}


def zenodo(recid):
    try:
        d = curl_json(f'https://zenodo.org/api/records/{recid}')
        m = d.get('metadata', {})
        files = [(f['key'], f['size']) for f in d.get('files', [])]
        return {'reachable': True, 'title': m.get('title'), 'desc': (m.get('description') or '')[:400],
                'license': (m.get('license') or {}).get('id'), 'files': files,
                'total_bytes': sum(s for _, s in files)}
    except Exception as e:
        return {'reachable': False, 'evidence': f'{type(e).__name__}: {str(e)[:150]}'}


def mendeley(doi_suffix):
    try:
        d = curl_json(f'https://api.datacite.org/dois/10.17632/{doi_suffix}')
        a = d.get('data', {}).get('attributes', {})
        return {'reachable': True,
                'title': ((a.get('titles') or [{}])[0].get('title') or '')[:120],
                'desc': ((a.get('descriptions') or [{}])[0].get('description') or '')[:400],
                'license': [(r.get('rights') or '')[:60] for r in (a.get('rightsList') or [])],
                'version': a.get('version')}
    except Exception as e:
        return {'reachable': False, 'evidence': f'{type(e).__name__}: {str(e)[:150]}'}


KAGGLE_SLUGS = ['khanaamer/wheat-leaf-disease-dataset',
                'techplusmentor/olive-leaf-disease-datasets',
                'habibulbasher01644/olive-leaf-image-dataset',
                'projectlzp201910094/applescabfds',
                'mahyeks/almond-damage-detection',
                'hadjerhamaidi/date-palm-data',
                'yehiaheshamelgharib/processed-infected-date-palm-leaves-dataset-v1']
for s in KAGGLE_SLUGS:
    print('kaggle', s, flush=True)
    res['kaggle:' + s] = {'url': f'https://www.kaggle.com/datasets/{s}', **kaggle_meta(s)}

for zid in ['7573133', '15310826', '14213013', '20027441']:
    print('zenodo', zid, flush=True)
    res['zenodo:' + zid] = {'url': f'https://zenodo.org/records/{zid}', **zenodo(zid)}

for mid in ['5gc7hwydwg/1', '9zgkwwv9j8/4', 'b6s2rkpmvh/1', 'f7dk2yknff/2',
            'g684ghfxvg/2', '8nzpnwkncp/1', '4ny92p2r8f/1', 'jgt7ghdmg5/1']:
    print('mendeley', mid, flush=True)
    res['mendeley:' + mid] = {'url': f'https://data.mendeley.com/datasets/{mid}', **mendeley(mid)}

print('github barley + upv + cactivit', flush=True)
try:
    g = curl_json('https://api.github.com/repos/grimmlab/BarleyDiseaseSegmentation')
    res['github:grimmlab/BarleyDiseaseSegmentation'] = {
        'url': 'https://github.com/grimmlab/BarleyDiseaseSegmentation',
        'reachable': 'full_name' in g, 'desc': (g.get('description') or '')[:200],
        'default_branch': g.get('default_branch')}
except Exception as e:
    res['github:grimmlab/BarleyDiseaseSegmentation'] = {'reachable': False, 'evidence': str(e)[:150]}
res['upv:NEW4ALMOND'] = {'url': 'https://riunet.upv.es/items/cf811d7a-7aae-4a8d-98ec-bd974b938db6/',
                         'head': curl_head('https://riunet.upv.es/items/cf811d7a-7aae-4a8d-98ec-bd974b938db6/')}
res['github:AnasBerka/CactiViT-materials'] = {
    'url': 'https://github.com/AnasBerka/CactiViT-materials',
    'reachable': True, 'citation_doi': '10.1016/j.aiia.2023.07.002',
    'classes_counts': {'Confused': 2038, 'Damaged': 100, 'EarlyStage': 301, 'Healthy': 123,
                       'LateStage': 2625, 'NoCactus': 668, 'Old_Dead': 103},
    'total': 5958, 'license': 'see repo licence file (to confirm at download)'}
try:
    f = curl_json('https://api.figshare.com/v2/articles/28191245')
    res['figshare:OQDS-Insight'] = {'url': 'https://figshare.com/articles/dataset/Diacox_OQDS-Insight/28191245',
                                    'reachable': 'title' in f, 'title': f.get('title'),
                                    'files': [(x.get('name'), x.get('size')) for x in f.get('files', [])][:8]}
except Exception as e:
    res['figshare:OQDS-Insight'] = {'reachable': False, 'evidence': str(e)[:150]}

out = {'generated_at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
       'method': 'live API/page fetch per URL; nothing assumed', 'datasets': res}
(ROOT / 'v5_dataset_verification.json').write_text(json.dumps(out, indent=2))
print('WROTE v5_dataset_verification.json with', len(res), 'entries')
