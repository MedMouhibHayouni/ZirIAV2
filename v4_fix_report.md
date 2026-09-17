# V4 Pipeline Fix Report: Disease-Level Taxonomy & Temperature Calibration

**Date:** 2026-09-12  
**Status:** Certified Verified  
**Artifacts Generated / Updated:**
* `entity_name_audit.md`
* `ai-vision/v4_metrics_report.json`
* `ai-vision/v4_best.pt`
* `ai-vision/ziria_v4_calibrated.pt`

---

## 1. Backend Entity Name Audit Summary (Phase 0)

| Purported / Assumed Name | Real Entity / Table Name | Code Location | Key Fields Verified | Status |
| :--- | :--- | :--- | :--- | :--- |
| `disease_prescription_rules` | `ProductPrescriptionRule` (`product_prescription_rules`) | `backend/src/expert/entities/product-prescription-rule.entity.ts` | `id`, `disease_name`, `allowed_product`, `default_dosage`, `default_application_method`, `pre_harvest_days`, `notes` | Confirmed exists |
| `disease_nomenclature_cache` | `NameDictionary` (`name_dictionary`) | `backend/src/name-dictionary/entities/name-dictionary.entity.ts` | `id`, `key`, `name_fr`, `name_ar` (Tunisian Darija), `name_lat`, `created_at` | Confirmed exists under `name_dictionary` |
| `diagnosis_resolution_log` | — | N/A | Current detection entity is `disease_detections` (`DiseaseDetection`). No `resolved_via` routing log table exists. | Confirmed does not exist yet |

---

## 2. Defect 1: Disease-Level Taxonomy Restored (Phase 1)

### Final Servable Disease-Level Class List (38 Classes)
The previous pipeline collapsed all pathologies into 14 plant species. The new servable classification targets are disease-level (crop + phytopathological condition):

```
1. apple_black_rot
2. apple_cedar_rust
3. apple_healthy
4. apple_scab
5. cherry_healthy
6. cherry_powdery_mildew
7. corn_cercospora_leaf_spot
8. corn_common_rust
9. corn_healthy
10. corn_northern_leaf_blight
11. grape_black_rot
12. grape_esca
13. grape_healthy
14. grape_leaf_blight
15. olive_diseased
16. olive_healthy
17. peach_bacterial_spot
18. peach_healthy
19. pep_bacterial_spot
20. pep_healthy
21. pot_early_blight
22. pot_healthy
23. pot_late_blight
24. raspberry_healthy
25. soybean_healthy
26. squash_powdery_mildew
27. strawberry_healthy
28. strawberry_leaf_scorch
29. tom_bacterial_spot
30. tom_early_blight
31. tom_healthy
32. tom_late_blight
33. tom_leaf_mold
34. tom_mosaic_virus
35. tom_septoria_leaf_spot
36. tom_spider_mites
37. tom_target_spot
38. tom_yellow_leaf_curl
```

### Olive Handling
* As instructed, Olive data on disk consists of Mediterranean field samples without comprehensive multi-pathology annotation (`aculus_olearius` and `olive_peacock_spot` vs `Healthy`).
* Kept as `olive_diseased` and `olive_healthy`.

### Excluded Classes (Insufficient Data < 30 Training Images)
* **Wheat (`wheat` / `Ble_dur`):** 16 raw images available in repository (`doctor_nabat`). Excluded from servable classes due to failing the $\ge 30$ image threshold. Documented as: *Insufficient data, requires active field collection in upcoming agricultural campaigns.*

---

## 3. Defect 2: Temperature Scaling & Sanity Check (Phase 2)

### Root Cause Analysis of Prior $T^* = 1.0$ Non-Result
SciPy's `minimize(..., method='L-BFGS-B')` was computing gradients via finite differences (`eps=1e-8`) over single-precision `float32` tensors. Perturbations of magnitude $10^{-8}$ underflowed float32 machine epsilon ($\approx 1.19 \times 10^{-7}$), causing numerically identical NLL values, zero finite-difference gradients, and premature optimizer termination at initial guess $x_0 = 0.0$ ($T^* = 1.0000$).

### Pre-Optimization Logit Range Diagnostic
* **Logit Range:** $\min = -3.9135$, $\max = 7.7100$, $\text{mean} = -0.5281$, $\text{std} = 1.1008$.
* **Raw Pre-Softmax Verification:** `is_probabilities = False` (confirmed unnormalized logits).

### Calibration Sanity-Check (Deliberate Miscalibration Recovery Test)
* **Proportional Scaling Check ($2.0 \times \mathbf{Z}$):**
  * Input: Real validation logits multiplied by 2.0.
  * Recovered Temperature: $T_{\text{broken}} = 1.1908$.
  * Baseline Real Temperature: $T^* = 0.5954$.
  * Recovered Scaling Ratio: $1.1908 / 0.5954 = \mathbf{2.0002\times}$ (Expected: $2.0000\times$, Error $< 0.01\%$).
* **Absolute Calibration Recovery Check (Baseline at $T=1.0 \times 2.0$):**
  * Recovered Temperature: $\mathbf{1.9952}$ (Target: $2.0000$, Error $< 0.24\%$).
  * **Status:** **PASSED**.

### Real Calibration Results
* **Optimal Temperature:** $T^* = \mathbf{0.5954}$
* **Validation ECE Before:** $0.1125$ ($11.25\%$)
* **Validation ECE After:** $\mathbf{0.0052}$ ($0.52\%$, **$-95.4\%$ reduction**)
* **Validation MCE:** $0.3690 \to 0.2846$

---

## 4. Evaluation Metrics on Held-Out Test Set (Phase 3)

| Metric | Measured Value | Sample Size ($n$) | Description |
| :--- | :---: | :---: | :--- |
| **Overall Test Top-1 Accuracy** | **97.94%** | $2,280$ | 38 disease-level classes |
| **Lab-Only Test Accuracy** | **99.23%** | $2,078$ | Controlled background leaf images |
| **Field-Only Test Accuracy** | **84.65%** | $202$ | Uncontrolled outdoor field images (PlantDoc + field Olive) |

*Field accuracy at the disease level is $84.65\%$, reflecting the genuine complexity of in-situ background noise and confusable symptoms.*
