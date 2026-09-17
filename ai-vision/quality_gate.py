"""ZirIA Sentinel v3 — image quality pre-filter (<10ms, PIL/numpy/scipy only).

Rejects garbage input before inference: blur (Laplacian variance),
under/over-exposure (mean brightness), minimum resolution.
Thresholds live in quality_thresholds.json (calibrated on the real hard set);
defaults are conservative seeds overwritten by calibration.
"""
import json
import time
from pathlib import Path
import numpy as np
from PIL import Image

try:
    from scipy import ndimage as _ndi
    _HAS_SCIPY = True
except Exception:
    _HAS_SCIPY = False

_TH_PATH = Path(__file__).parent / 'quality_thresholds.json'
_DEFAULTS = {'blur_min': 60.0, 'bright_lo': 35.0, 'bright_hi': 220.0, 'min_side': 160}


def get_thresholds():
    th = dict(_DEFAULTS)
    try:
        if _TH_PATH.exists():
            th.update(json.loads(_TH_PATH.read_text()))
    except Exception:
        pass
    return th


def save_thresholds(th):
    _TH_PATH.write_text(json.dumps(th, indent=2))


def _laplacian_var(gray):
    a = gray.astype(np.float32)
    lap = a[:-2, 1:-1] + a[2:, 1:-1] + a[1:-1, :-2] + a[1:-1, 2:] - 4.0 * a[1:-1, 1:-1]
    return float(lap.var())


def assess_image(img, thresholds=None):
    """Returns dict(ok, reject_reason, blur, brightness, width, height, latency_ms)."""
    t0 = time.perf_counter()
    th = thresholds or get_thresholds()
    if isinstance(img, (str, Path)):
        img = Image.open(img).convert('RGB')
    else:
        img = img.convert('RGB')
    w, h = img.size
    if max(w, h) > 256:
        img = img.resize((int(w * 256 / max(w, h)), int(h * 256 / max(w, h))), Image.BILINEAR)
    reason = None
    if min(w, h) < int(th['min_side']):
        reason = f'image too small ({w}x{h}), please retake closer'
    gray = np.array(img.convert('L'))
    blur = _laplacian_var(gray)
    bright = float(gray.mean())
    if reason is None and blur < float(th['blur_min']):
        reason = 'photo too blurry, please retake'
    if reason is None and bright < float(th['bright_lo']):
        reason = 'photo too dark (underexposed), please retake with more light'
    if reason is None and bright > float(th['bright_hi']):
        reason = 'photo overexposed/washed out, please retake avoiding direct glare'
    return {'ok': reason is None, 'reject_reason': reason, 'blur': blur,
            'brightness': bright, 'width': w, 'height': h,
            'latency_ms': (time.perf_counter() - t0) * 1000.0}
