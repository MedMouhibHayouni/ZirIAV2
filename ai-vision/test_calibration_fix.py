"""Test script to verify Defect 2: Temperature scaling diagnostic & recovery test."""
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

def softmax(z):
    z = z - z.max(1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(1, keepdims=True)

def ece_mce(probs, labels, n_bins=15):
    conf = probs.max(1)
    pred = probs.argmax(1)
    ok = (pred == labels).astype(float)
    bins = np.linspace(0, 1, n_bins + 1)
    ece = mce = 0.0
    for i in range(n_bins):
        m = (conf > bins[i]) & (conf <= bins[i + 1])
        if m.sum():
            gap = abs(ok[m].mean() - conf[m].mean())
            ece += m.sum() / len(labels) * gap
            mce = max(mce, gap)
    return float(ece), float(mce)

def calibrate_temperature_pytorch(logits_np, labels_np, tag=""):
    print(f"[{tag}] Logit range: min={logits_np.min():.4f}, max={logits_np.max():.4f}, std={logits_np.std():.4f}")
    is_probs = bool((logits_np.min() >= -1e-5) and (logits_np.max() <= 1.0001) and np.allclose(logits_np.sum(1), 1.0, atol=1e-2))
    print(f"[{tag}] Verified raw pre-softmax logits: {not is_probs}")
    
    logits_t = torch.tensor(logits_np, dtype=torch.float32)
    labels_t = torch.tensor(labels_np, dtype=torch.long)
    
    log_T = nn.Parameter(torch.zeros(1))
    optimizer = torch.optim.LBFGS([log_T], lr=0.05, max_iter=100, tolerance_grad=1e-7, tolerance_change=1e-9)
    
    def closure():
        optimizer.zero_grad()
        loss = F.cross_entropy(logits_t / torch.exp(log_T), labels_t)
        loss.backward()
        return loss
        
    optimizer.step(closure)
    Tstar = float(torch.exp(log_T).item())
    return Tstar

if __name__ == '__main__':
    # Generate synthetic validation logits with known temperature
    np.random.seed(42)
    torch.manual_seed(42)
    n, c = 2000, 36
    true_logits = np.random.randn(n, c).astype(np.float32) * 2.5
    probs = softmax(true_logits)
    labels = np.array([np.random.choice(c, p=p) for p in probs])
    
    # Sanity check: deliberately multiply by 2.0 (overconfident)
    miscalibrated_logits = true_logits * 2.0
    T_recovered = calibrate_temperature_pytorch(miscalibrated_logits, labels, tag="SANITY_CHECK_x2")
    print(f"SANITY CHECK: Deliberately miscalibrated (x2.0) -> Recovered T* = {T_recovered:.4f}")
    assert abs(T_recovered - 2.0) < 0.15, f"Recovery failed: expected ~2.0, got {T_recovered}"
    print("SANITY CHECK PASSED!")
