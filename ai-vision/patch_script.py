with open("train_sentinel_v2.py", "r", encoding="utf-8") as f:
    content = f.read()

report_impl = """
def classification_report(y_true, y_pred, target_names=None, labels=None, digits=3):
    from collections import defaultdict
    if labels is None:
        labels = sorted(set(y_true.tolist() + y_pred.tolist()))
    counts = defaultdict(lambda: {"tp":0,"fp":0,"fn":0,"support":0})
    for yt, yp in zip(y_true, y_pred):
        counts[yt]["support"] += 1
        if yt == yp:
            counts[yt]["tp"] += 1
        else:
            counts[yt]["fn"] += 1
            counts[yp]["fp"] += 1
    header = f"{'class':<35} {'prec':>8} {'rec':>8} {'f1':>8} {'sup':>8}"
    lines = [header]
    for i, lbl in enumerate(labels):
        tp = counts[lbl]["tp"]; fp = counts[lbl]["fp"]; fn = counts[lbl]["fn"]
        sup = counts[lbl]["support"]
        prec = tp/(tp+fp) if (tp+fp)>0 else 0.0
        rec  = tp/(tp+fn) if (tp+fn)>0 else 0.0
        f1   = 2*prec*rec/(prec+rec) if (prec+rec)>0 else 0.0
        name = target_names[i] if target_names else str(lbl)
        lines.append(f"{name:<35} {prec:8.3f} {rec:8.3f} {f1:8.3f} {sup:8d}")
    acc = (y_true == y_pred).mean()
    lines.append(f"accuracy: {acc:.3f}")
    return "\n".join(lines)
"""

content = content.replace(
    "from sklearn.metrics import classification_report",
    report_impl.strip()
)

with open("train_sentinel_v2.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Patched OK")
