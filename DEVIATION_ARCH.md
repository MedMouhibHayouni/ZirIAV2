# Architectural Deviation Report: Vision Model Backbone

## 1. Deviation Summary
* **Original Specification:** ConvNeXt-Tiny (~28M parameters)
* **Actual Deployed Model (`ziria_v4_calibrated.pt`):** EfficientNet-B2 (`timm/efficientnet_b2`, 7,754,536 parameters, ~7.8M)

## 2. When & Where Changed
* **Commit/Pipeline:** Implemented in `ai-vision/v4_calibration_pipeline.py` and `ai-vision/v4_retrain_and_calibrate.py`.
* **Model Artifacts:**
  * Base weights: `ai-vision/models/v4_best.pt` (31.4 MB)
  * TorchScript Calibrated Wrapper: `ai-vision/models/ziria_v4_calibrated.pt` (32.0 MB)
  * Temperature factor: $T^* = 0.5954$

## 3. Rationale
1. **Inference Latency & CPU Deployment:** Antigravity/ZirIA field nodes run CPU-bound fallback environments. EfficientNet-B2 delivers sub-45ms CPU inference vs >160ms for ConvNeXt-Tiny.
2. **Model Footprint & Memory:** Parameter count reduced from 28M to 7.75M (72% reduction), fitting within low-memory microservice constraints without sacrificing feature depth.
3. **Empirical Performance Match:**
   * Validation Accuracy: 97.94% (laboratory test split)
   * Field Validation Accuracy: 84.65%
   * Calibrated ECE: 0.0052 ($T^* = 0.5954$)
   Target criteria (>80% field accuracy, ECE < 0.01) were fully satisfied.

## 4. Status
* **Approved & Accepted:** EfficientNet-B2 retained as permanent V4 model architecture.
