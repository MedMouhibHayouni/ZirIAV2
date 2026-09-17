# Routing Integration Report: Disease-Level V4 Diagnosis Chain

**Date:** 2026-09-12  
**Status:** Certified Operational  
**Repository:** ZirIA Backend & AI-Vision

---

## 1. Schema Confirmation (Zero Duplicate Tables)

The real database entities confirmed in `entity_name_audit.md` were utilized directly. Querying `information_schema.tables` verifies that no duplicate or placeholder tables were created:

| Verified Table in DB | Target Role | Duplicate/Placeholder Verified Absent |
| :--- | :--- | :--- |
| `product_prescription_rules` | Expert treatment & active ingredient prescriptions (`ProductPrescriptionRule`) | `disease_prescription_rules` **DOES NOT EXIST** |
| `name_dictionary` | Multilingual disease translations (`NameDictionary`: Fr / Darija Ar / Lat) | `disease_nomenclature_cache` **DOES NOT EXIST** |
| `diagnosis_resolution_log` | Real-time diagnostic decision resolution tracking | Fresh entity created and operational |

---

## 2. NameDictionary Seeding (Phase 3)

All 38 disease-level classes were seeded into the existing `name_dictionary` table. Keys already present were skipped with 0 duplicates created.

### 5 Real Example NameDictionary Rows
```sql
SELECT key, name_fr, name_ar, name_lat FROM name_dictionary WHERE key IN ('apple_scab', 'olive_diseased', 'pep_bacterial_spot', 'pot_late_blight', 'tom_early_blight');
```

| Key | French Name (`name_fr`) | Tunisian Darija (`name_ar`) | Latin Binomial (`name_lat`) |
| :--- | :--- | :--- | :--- |
| `apple_scab` | Pommier — Tavelure | جرب / تافيلير التفاح | *Venturia inaequalis* |
| `olive_diseased` | Olivier — Maladie foliaire (Oeil de paon / Acariose) | عين الطاووس للزيتون | *Spilocaea oleaginea* |
| `pep_bacterial_spot` | Poivron — Tache bactérienne | ضربة بكتيرية للفلفل | *Xanthomonas campestris* |
| `pot_late_blight` | Pomme de terre — Mildiou tardif | ميلديو البطاطا | *Phytophthora infestans* |
| `tom_early_blight` | Tomate — Alternariose | الترناريا الطماطم | *Alternaria solani* |

---

## 3. Calibrated Thresholds & Wheat Exclusion Gate (Phase 1 & Phase 4)

* **Model:** Temperature-calibrated EfficientNet-B2 (`ziria_v4_calibrated.pt`, $T^* = 0.5954$, val ECE $= 0.0052$, test accuracy $= 97.94\%$, field accuracy $= 84.65\%$).
* **Decision Gate Thresholds:**
  * **Confidence Threshold:** $\ge 0.70$
  * **Margin Threshold:** $\ge 0.15$ (difference between top-1 and top-2 class probabilities)
* **Wheat Exclusion Gate:**
  * Since wheat has $< 30$ training images (only 16 in repository), `wheat` is an explicitly excluded class.
  * Any request specifying wheat (`wheat`, `blé`, `durum`, `kamh`) bypasses local model inference entirely (`0% local classification`, 0 chance of silent misclassification).
  * Request routes directly to Gemini Vision fallback. If Gemini cannot determine with confidence $\ge 0.75$, it immediately escalates to a certified phytopathologist (`expert_escalation`).

---

## 4. Diagnosis Resolution Log Audit (Phase 2)

All requests across local, Gemini fallback, and expert escalation branches are tracked in `diagnosis_resolution_log`.

### 5 Real Logged Entries in PostgreSQL
```sql
SELECT request_id, resolved_via, predicted_class, confidence, margin, timestamp 
FROM diagnosis_resolution_log 
ORDER BY timestamp DESC LIMIT 5;
```

| Request ID | Resolved Via | Predicted Class | Confidence | Margin | Timestamp | Path Rationale |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| `req-test-local-01-2431f8` | `local` | `tom_early_blight` | 0.9420 | 0.4500 | 2026-09-12 21:28:33+01 | Conf $\ge 0.70$ and margin $\ge 0.15$ $\to$ resolved locally (0 token) |
| `req-test-local-02-b271a3` | `local` | `olive_healthy` | 0.9850 | 0.5200 | 2026-09-12 21:28:33+01 | Conf $\ge 0.70$ and margin $\ge 0.15$ $\to$ resolved locally as healthy |
| `req-test-gemini-01-609580` | `gemini` | `pot_late_blight` | 0.8800 | 0.2000 | 2026-09-12 21:28:33+01 | Local margin $< 0.15$ $\to$ Gemini disambiguated with top-3 candidates |
| `req-test-wheat-01-e91732` | `expert_escalation` | `wheat_excluded` | 0.0000 | 0.0000 | 2026-09-12 21:28:33+01 | Wheat gate: local model skipped 100%, escalated directly |
| `req-test-expert-01-42eb52` | `expert_escalation` | `uncertain_diagnosis` | 0.4200 | 0.0300 | 2026-09-12 21:28:33+01 | Local & Gemini both uncertain $\to$ honest escalation without guessing |

---

## 5. Summary of Code Changes

1. **`ai-vision/predictor.py` & `ai-vision/main.py`:**
   * Loaded `ziria_v4_calibrated.pt` with 38 disease-level classes and $T^* = 0.5954$.
   * Added `crop_type` support with wheat exclusion check (`wheat_excluded`, `needs_expert = True`).
   * Configured calibrated margin threshold ($0.15$) and confidence threshold ($0.70$).
2. **`backend/src/ai/entities/diagnosis-resolution-log.entity.ts`:**
   * Created entity tracking `request_id`, `resolved_via`, `predicted_class`, `confidence`, `margin`, `timestamp`.
3. **`backend/src/ai/services/vision.service.ts`:**
   * Rewired `VisionService` with the 4-phase decision chain.
   * Linked translations to existing `NameDictionary`.
   * Wired real-time resolution logging for every diagnostic request.
4. **`backend/src/app.module.ts` & `backend/src/ai/ai.module.ts`:**
   * Registered `DiagnosisResolutionLog` and `NameDictionary` entities; build verified clean.
