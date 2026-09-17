# Backend Entity Name Audit

**Date:** 2026-09-12  
**Scope:** Confirmation of backend entity names, locations, and key fields.

---

### 1. Prescription Rule Entity
* **Assumed Name:** `disease_prescription_rules`
* **Real Class Name:** `ProductPrescriptionRule`
* **Table Name:** `product_prescription_rules`
* **File Location:** `backend/src/expert/entities/product-prescription-rule.entity.ts`
* **Key Fields:**
  * `id`: `number` (PrimaryGeneratedColumn)
  * `disease_name`: `string`
  * `allowed_product`: `string`
  * `default_dosage`: `string`
  * `default_application_method`: `string`
  * `pre_harvest_days`: `number`
  * `notes`: `string` (nullable)

---

### 2. Disease Nomenclature Cache Entity
* **Assumed Name:** `disease_nomenclature_cache`
* **Actual Corresponding Entity:** `NameDictionary`
* **Table Name:** `name_dictionary`
* **File Location:** `backend/src/name-dictionary/entities/name-dictionary.entity.ts`
* **Status:** `disease_nomenclature_cache` does not exist under that literal name; multilingual translations (French, Tunisian Arabic / Darija, Latin) are handled via `name_dictionary`.
* **Key Fields:**
  * `id`: `string` (UUID)
  * `key`: `string` (unique disease / condition identifier)
  * `name_fr`: `string`
  * `name_ar`: `string` (Tunisian Arabic / Darija)
  * `name_lat`: `string` (Latin binomial)
  * `created_at`: `Date`
  * `updated_at`: `Date`

---

### 3. Diagnosis Resolution Log Entity
* **Assumed Name:** `diagnosis_resolution_log`
* **Status:** Confirmed does not exist yet anywhere in the backend schema.
* **Existing Related Table:** `disease_detections` (`DiseaseDetection` at `backend/src/disease-detections/entities/disease-detection.entity.ts`) tracks detections with confidence, urgency, and expert validation flags, but lacks resolution routing metadata (`resolved_via`).
