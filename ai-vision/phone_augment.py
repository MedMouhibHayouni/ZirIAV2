"""ZirIA Sentinel v3 — phone-camera simulation augment (PIL/numpy/scipy only).

Applies a random subset (1-3 effects) of phone-capture degradations with
capped severity so lesion color/shape (the diagnostic signal) survives.
Usage: PhoneCameraAugment(p=0.45) as a torchvision-style callable on PIL images.
"""
import io
import random
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

try:
    from scipy import ndimage as _ndi
    _HAS_SCIPY = True
except Exception:
    _HAS_SCIPY = False


def _motion_blur(arr, size=5, angle=0.0):
    if not _HAS_SCIPY:
        return arr
    k = np.zeros((size, size), dtype=np.float32)
    k[size // 2, :] = 1.0 / size
    if angle:
        k = _ndi.rotate(k, angle, reshape=False, order=1, mode='constant', cval=0.0)
        k = np.clip(k, 0, None)
        s = k.sum()
        if s > 1e-6:
            k = k / s
    out = np.empty_like(arr)
    for c in range(arr.shape[2]):
        out[:, :, c] = _ndi.convolve(arr[:, :, c].astype(np.float32), k, mode='reflect')
    return np.clip(out, 0, 255).astype(np.uint8)


def _jpeg_recompress(pil_img, quality):
    buf = io.BytesIO()
    pil_img.save(buf, format='JPEG', quality=int(quality))
    buf.seek(0)
    return Image.open(buf).convert('RGB')


def _auto_exposure(arr, gamma, bright):
    lut = (np.linspace(0, 1, 256) ** gamma) * 255.0
    out = lut[np.clip(arr.astype(np.int32), 0, 255)].astype(np.float32) * bright
    return np.clip(out, 0, 255).astype(np.uint8)


def _smudge(pil_img, n_patches=1):
    img = pil_img.copy()
    w, h = img.size
    for _ in range(n_patches):
        pw, ph = int(w * random.uniform(0.05, 0.15)), int(h * random.uniform(0.05, 0.15))
        x0 = random.randint(0, max(0, w - pw))
        y0 = random.randint(0, max(0, h - ph))
        patch = img.crop((x0, y0, x0 + pw, y0 + ph)).filter(
            ImageFilter.GaussianBlur(radius=random.uniform(3, 7)))
        mask = Image.new('L', (pw, ph), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, pw, ph], fill=int(255 * random.uniform(0.5, 0.8)))
        img.paste(patch, (x0, y0), mask)
    return img


def _wb_shift(arr, warm):
    out = arr.astype(np.float32)
    if warm:
        out[:, :, 0] *= random.uniform(1.05, 1.15)
        out[:, :, 2] *= random.uniform(0.85, 0.95)
    else:
        out[:, :, 2] *= random.uniform(1.05, 1.15)
        out[:, :, 0] *= random.uniform(0.85, 0.95)
    return np.clip(out, 0, 255).astype(np.uint8)


class PhoneCameraAugment:
    def __init__(self, p=0.45, seed=None):
        self.p = p
        self.rng = random.Random(seed)

    def __call__(self, img):
        if self.rng.random() > self.p:
            return img
        img = img.convert('RGB')
        effects = ['motion', 'jpeg', 'exposure', 'smudge', 'wb']
        self.rng.shuffle(effects)
        for eff in effects[:self.rng.randint(1, 3)]:
            try:
                if eff == 'motion':
                    img = Image.fromarray(_motion_blur(
                        np.array(img), size=self.rng.choice([3, 5, 7]),
                        angle=self.rng.uniform(0, 180)))
                elif eff == 'jpeg':
                    img = _jpeg_recompress(img, self.rng.uniform(40, 70))
                elif eff == 'exposure':
                    img = Image.fromarray(_auto_exposure(
                        np.array(img), self.rng.uniform(0.5, 1.8),
                        self.rng.uniform(0.6, 1.4)))
                elif eff == 'smudge':
                    img = _smudge(img, self.rng.randint(1, 2))
                elif eff == 'wb':
                    img = Image.fromarray(_wb_shift(np.array(img), self.rng.random() < 0.5))
            except Exception:
                continue
        return img
