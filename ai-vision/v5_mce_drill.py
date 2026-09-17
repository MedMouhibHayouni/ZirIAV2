"""Diagnose MCE driver: which bin / class causes 0.56 post-calibration."""
import json
from pathlib import Path
import numpy as np
import torch
from torchvision import datasets as tvds, transforms as T
import timm
from PIL import Image as PImage

ROOT = Path(__file__).parent.resolve()
MAN = json.loads((ROOT/'dataset_manifest_v5.json').read_text())
CLASSES = MAN['final_classes']
CAL = json.loads((ROOT/'v5_calibration.json').read_text())
Tstar = CAL['Tstar']
print(f'Tstar {Tstar} classes {len(CLASSES)}')
# load model
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = timm.create_model('efficientnet_b2', pretrained=False, num_classes=len(CLASSES), drop_rate=0.25)
model.load_state_dict(torch.load(ROOT/'v5_best.pt', map_location='cpu'))
model = model.to(DEVICE).eval()
IMG=256
eval_tf = T.Compose([T.Resize((IMG,IMG)), T.ToTensor(), T.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])])
ds = tvds.ImageFolder(str(ROOT/'data/v5/test'), transform=eval_tf)
remap = {i: CLASSES.index(c) for i,c in enumerate(ds.classes) if c in CLASSES}
from torch.utils.data import DataLoader
dl = DataLoader(ds, batch_size=48, shuffle=False, num_workers=0)
Ls, Ys = [], []
import torch
with torch.no_grad():
    for x,y in dl:
        ym = torch.tensor([remap[int(v)] for v in y])
        out = model(x.to(DEVICE)).cpu().double().numpy()
        Ls.append(out); Ys.append(ym.numpy())
L = np.concatenate(Ls); Y = np.concatenate(Ys)
def softmax(z):
    z = z - z.max(1, keepdims=True)
    e = np.exp(z); return e/e.sum(1,keepdims=True)
p = softmax(L / Tstar)
conf = p.max(1); pred = p.argmax(1); ok = (pred==Y).astype(float)
# per-bin
bins = np.linspace(0,1,16)
print('BIN analysis (post-cal):')
for i in range(15):
    m = (conf > bins[i]) & (conf <= bins[i+1])
    if m.sum()==0: continue
    gap = abs(ok[m].mean() - conf[m].mean())
    # top classes in bin
    from collections import Counter
    c = Counter([CLASSES[p] for p in pred[m]])
    top = c.most_common(3)
    print(f' bin {bins[i]:.2f}-{bins[i+1]:.2f} n={m.sum():4d} acc={ok[m].mean():.3f} conf={conf[m].mean():.3f} gap={gap:.3f} top={top} MCE_contrib={gap:.3f}')
# per-class in worst bin (likely low-confidence)
# find bin with max gap
gaps=[]
for i in range(15):
    m = (conf > bins[i]) & (conf <= bins[i+1])
    if m.sum(): gaps.append((abs(ok[m].mean()-conf[m].mean()), i))
worst = max(gaps)[1]
print(f'WORST bin {worst} {bins[worst]:.2f}-{bins[worst+1]:.2f}')
m = (conf > bins[worst]) & (conf <= bins[worst+1])
# per-class within worst bin
from collections import Counter
for cls in set(pred[m]):
    mask = (pred==cls) & m
    if mask.sum()<2: continue
    print(f'  class {CLASSES[cls]} n={mask.sum()} acc={(pred[mask]==Y[mask]).mean():.3f} mean_conf={conf[mask].mean():.3f}')
# per-class overall ECE contribution
print('PER-CLASS overall (post-cal):')
for idx, cname in enumerate(CLASSES):
    mask = (Y==idx)  # true label = cname
    if mask.sum()<10: continue
    # accuracy for this class = pred == idx when true==idx? That's recall
    # instead per-predicted class
    pass
# per-predicted class
for idx, cname in enumerate(CLASSES):
    mask = (pred==idx)
    if mask.sum()<5: continue
    acc = (Y[mask]==idx).mean()
    mean_conf = conf[mask].mean()
    gap = abs(acc-mean_conf)
    print(f' pred {cname:30s} n={mask.sum():4d} acc={acc:.3f} conf={mean_conf:.3f} gap={gap:.3f}')
