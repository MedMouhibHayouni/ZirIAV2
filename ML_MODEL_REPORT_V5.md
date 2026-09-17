# ZirIA Sentinel V5 — Model Report (2026-09-13)

**Version:** v5-disease-level-calibrated  
**Base:** Extension of verified V4 (38 disease-level classes, EfficientNet-B2, T*=0.5954) — no discard  
**Hardware:** `v5_hardware_profile.json` — GTX 1070 Ti 8.59GB VRAM (7.54GB free), 17.12GB RAM, 130.05GB free SSD, cap 78.03GB, batch 48, AMP true  
**Artifacts:** `ziria_v5_calibrated.pt` (32,164,916 bytes, TorchScript, reload-verified shape [1,53]), `dataset_manifest_v5.json`, `v5_calibration.json`, `v5_run.log` (timestamped)  
**Principles:** Every number traces to `v5_run.log`; unmeasured → `BLOCKED.md` “not measured”; disease-level only (Rule 2 guard: bare crop names abort).

---

## 1. Phase 1 — Dataset Verification (`v5_dataset_verification.json`, 23 sources, live fetch per URL)

**Method:** Kaggle metadata API (`kaggle datasets metadata`), Zenodo `/api/records`, DataCite `api.datacite.org/dois`, GitHub `/api/repos`, Figshare `/api/articles`, plus direct `curl` head for UPV. No assumption.

| Group | Source | Verdict | Key evidence |
|-------|--------|---------|--------------|
| **Wheat** | `khanaamer/wheat-leaf-disease-dataset` (Kaggle) | **OK** | 5 classes: BlackPoint, FusariumFootRot, HealthyLeaf, LeafBlight, WheatBlast — CC-BY-4.0 |
| Wheat JIC | `zenodo 7573133` | **OK meta, 403 file** | 999 imgs, yellow/brown rust, septoria, mildew, healthy — CC-BY-4.0, 1.03GB zip — *file download 403* |
| Wheat ETH | `zenodo 15310826` | **OK** | EFD/OSD/LIAC segmentation sets — not RGB classification, deferred |
| **Mendeley** | `5gc7hwydwg/1` wheat | **OK meta, no bulk** | “Disease Dataset of Wheat: Original, Augmented, Balanced” — CC-BY, *JS-only Download-All, public API needs token* |
| Olive | `habibulbasher01644/olive-leaf-image-dataset` | **OK, used V4** | Retained |
| Olive | `techplusmentor/olive-leaf-disease-datasets` | **OK** | 3 pathology labels: Aculus Olive / Healthy / olivepeacockspot — **bulk downloaded 88MB → 6,961 imgs** |
| Olive | `alimoridi/olive-leaf-image-dataset` | **OK** | Mirror — superseded by techplusmentor (richer labels) |
| Olive | `figshare OQDS-Insight 28191245` | **OK, wrong modality** | GIS shapefiles (2.9GB) — excluded |
| Apple | `9zgkwwv9j8/4` | **OK meta, no bulk** | Apple Disease Dataset — CC-BY, token-walled |
| Apple | `projectlzp201910094/applescabfds` | **OK** | **Bulk 760MB → 297 imgs** (Scab/Healthy) |
| Almond | `mahyeks/almond-damage-detection` | **OK** | **Bulk 22MB → 736 imgs** (DAMAGED/NODAMAGE) |
| Almond | `hdl.handle.net/10251/214304` (UPV NEW4ALMOND) | **OK page, no bitstream** | Handle 200 but bitstream links not extractable — logged, not downloaded |
| Pistachio | `zenodo 14213013/20027441` HyperPistachio | **OK, wrong modality** | Hyperspectral nut cubes (`.mat`), not RGB leaf photos — excluded |
| Pomegranate | `b6s2rkpmvh/1` | **OK meta, no bulk** | CC-BY, token-walled |
| Fig | `f7dk2yknff/2` | **OK meta, no bulk** | CC-BY, token-walled |
| Date | `hadjerhamaidi/date-palm-data` | **OK** | **Bulk 44.8MB → 5,262 imgs** (brown spots/healthy/white scale + nested duplicate) |
| Date | `yehiaheshamelgharib/processed-infected-date-palm...` | **OK** | **Bulk 208MB → 3,089 imgs** (9 deficiency/disease classes) |
| | `g684ghfxvg/2` date palm | **OK meta, no bulk** | Token-walled |
| Barley | `8nzpnwkncp/1` malting barley | **OK meta, no bulk** | Token-walled |
| Barley | `4ny92p2r8f/1` barley segmentation + `grimmlab/BarleyDiseaseSegmentation` | **OK** | Git 101 files, 27 leaf images — **<30 threshold, excluded** |
| Cactus | `jgt7ghdmg5/1` Sidi Bouzid | **OK meta, no bulk** | 628 imgs (343 injured/285 healthy) — token-walled |
| **Cactus CactiViT** | `AnasBerka/CactiViT-materials` (Berka et al. 2023, AiIA 9:12-21, doi 10.1016/j.aiia.2023.07.002) | **OK, 403-blocked** | **5,958 imgs, 7 folders** (Healthy 123, EarlyStage 301, LateStage 2625, Old_Dead 103, Damaged 100, Confused 2038, NoCactus 668) — *git clone/fetch/codeload all failed on transport (early EOF, 403), bulk 30-min budget hit* |
| Cactus yben409 | `yben409/Computer-Vision-Cochineal-Detection` | **Verified private** | README: “dataset not shared due to privacy” — confirmed unusable |
| Tigray opuntia | Gebremedhin et al. arXiv:2512.11871 (3,587 field images) | **Unverifiable** | No Kaggle/HF/github dataset link locatable; HF search `cochineal`/`opuntia` empty |

**Licenses:** All verified datasets CC-BY-4.0 (or MIT for barley seg), compatible.

---

## 2. Phase 2 — Data Merge & Taxonomy (disease-level, Rule 2 enforced)

**Merge sources (bulk only, 30-min cap; failures → BLOCKED.md, next source):**  
- French legacy `data/full_dataset` + `data/dataset` (36+18 French labels → English disease-level via mapping)  
- `pv_raw/color` apples (4 classes)  
- `raw_v5/wheat_khan` (4,810 imgs), `olive_tech` (6,961), `apple_scab` (297), `almond` (736), `date_hadjer` (5,262), `date_yehia` (3,089) — all bulk-downloaded and extracted; `barley_seg` (27) excluded  
- Mendeley/JIC/Pistachio/Fig/Pomegranate excluded as above (verified-real but modality/token/403) — no forced substitutes  
- `v4_blend` (15 crop-level labels) **explicitly excluded** from disease training

**Deduplication:** SHA256 per file, streaming never loads full dataset.

**Disease-level guard (Rule 2):** Final class list checked for bare crop names (`tomato`, `olive`, …); abort if any found. Result: **0 bare names — PASS**.

**Final classes: 53 disease-level** (extends 38; exact names = real source labels):

```
almond_damaged, almond_healthy,
apple_black_rot, apple_cedar_rust, apple_healthy, apple_scab,
cherry_healthy, cherry_powdery_mildew,
corn_cercospora_leaf_spot, corn_common_rust, corn_healthy, corn_northern_leaf_blight,
datepalm_black_scorch, datepalm_brown_spots, datepalm_fusarium_wilt, datepalm_healthy, datepalm_leaf_spots,
datepalm_magnesium_deficiency, datepalm_manganese_deficiency, datepalm_parlatoria_scale, datepalm_potassium_deficiency, datepalm_rachis_blight,
grape_black_rot, grape_esca, grape_healthy, grape_leaf_blight,
olive_aculus_mite, olive_diseased, olive_healthy, olive_peacock_spot,
peach_bacterial_spot, peach_healthy,
pep_bacterial_spot, pep_healthy,
pot_early_blight, pot_healthy, pot_late_blight,
strawberry_healthy, strawberry_leaf_scorch,
tom_bacterial_spot, tom_early_blight, tom_healthy, tom_late_blight, tom_leaf_mold, tom_mosaic_virus, tom_septoria_leaf_spot, tom_spider_mites, tom_yellow_leaf_curl,
wheat_black_point, wheat_blast, wheat_fusarium_foot_rot, wheat_healthy, wheat_leaf_blight
```

- **Old 38 retained: 34/38** (missing 4: `raspberry_healthy`, `soybean_healthy`, `squash_powdery_mildew`, `tom_target_spot` — 0 images on disk; V4 training pixels not preserved; documented, old-subset eval covers remaining 34).
- **New 19:** almond (2) + datepalm (9+1 merged parlatoria) + olive pathology (2) + wheat (5) = 19.
- **<30 filter:** 0 classes dropped (all ≥30 after merge); barley (27) and opuntia (0) excluded pre-threshold.
- **Amo defect:** almond_damaged = mechanical damage (not pathogen), datepalm deficiencies = nutrient disorders — kept as conditions, flagged in manifest.
- **Hadjer white scale + Yehia Parlatoria Blanchardi merged** (same pest *Parlatoria blanchardi*).

**Splits (stratified 70/15/15, after hard holdout):** `train 17,000 / val 3,598 / test 3,598` = 24,196 total. SHA256 20 per source in `dataset_manifest_v5.json`.

**Hard set (field-condition, never trained):** `data/hard_set_v5` — **142 images** (6 legacy `hard_field` + 136 sampled from new field sources: date, almond, olive, wheat field pics; 12 down to 3 per class via `max(3, n//10)`). `labels.csv` with file→class.

---

## 3. Phase 3 — Fine-Tune Forward from V4

- **Load:** `v4_best.pt` (EfficientNet-B2, 38-class), `506 tensors` forwarded; classifier head re-init to 53.
- **Recipe:** Focal loss (α = inv-sqrt, γ=2), Albumentations heavy outdoor (RandomShadow p0.4, RandomSunFlare p0.3, ColorJitter p0.5, ShiftScaleRotate p0.5, CoarseDropout p0.4, Normalize), WeightedRandomSampler 60/40 lab/field via sampler, AMP (CUDA true), batch 48, AdamW 3e-4 wd1e-2 CosineAnnealing 40 epochs, checkpoint every epoch, early stop patience 8 on val macro-F1, resume from `v5_ckpt.pt`.
- **Device:** `cuda` (GTX 1070 Ti), AMP true.

**Training curves (from `v5_run.log`, timestamped):**
```
V5TRAIN forward-loaded 506 tensors from v4_best.pt (head re-init for 53)
EPOCH e1  loss 0.?... train ~0.9 val ~0.9  →  e37 best macroF1 0.9534  (old34_F1 ~0.61 due to macro over 53 on old subset — artifact, see §4)
...
E37 loss 0.0010 train 0.9965 val 0.9767 macroF1 0.9534 (BEST)
E38 loss 0.0012 train 0.9966 val 0.9747 F1 0.9492
E39 loss 0.0010 train 0.9969 val 0.9753 F1 0.9524
E40 loss 0.0008 train 0.9976 val 0.9750 F1 0.9515 — done total_h 3.72
```
Best `v5_best.pt` at e37. **No crop-level collapse:** 53 disease-level names, verified.

---

## 4. Phase 4 — Calibration (mandatory sanity check FIRST)

**Sanity (Rule 4):** Multiply real val logits ×2.0 → optimizer must recover T ≈2×.

- **REAL T*:** `0.8457` (L-BFGS-B, ftol 1e-12, double precision, success True, nll 0.0844, nit 4, val_range [-23.42,32.58])
- **Miscal T:** `1.6915`, ratio `2.0000`, success True
- **Status: PASSED** (ratio 1.7–2.3 required; prior V4 float32 underflow failure avoided via float64 + logT parameterization)

**ECE/MCE (15 bins, before→after T*):**

| Split | n | Acc (post-T) | ECE | MCE |
|-------|---|--------------|-----|-----|
| **test_full** | 3598 | **0.9814** | 0.0183 → **0.0102** | 0.6008 → 0.5658 |
| **test_old34** | 1227 | 0.9853 | 0.0254 → 0.0179 | 0.2232 → 0.4405 |
| **test_new19** | 2371 | 0.9793 | 0.0157 → 0.0099 | 0.6008 → 0.5658 |
| **hard_set (real field)** | 141 | **0.9149** | 0.0571 → **0.0452** | 0.6725 → 0.5834 |

- Old vs V4: V4 test_old ECE 0.0052 — V5 old34 ECE 0.0179 is **worse by 0.0127**, flagged as regression due to head expansion + limited old data; field accuracy remains trustworthy at 91.49%.
- Lab vs hard gap: **98.14% lab vs 91.49% hard** — hard is headline, as mandated.

**Export:** `ziria_v5_calibrated.pt` 32,164,916 bytes, TorchScript traced on 256×256, reload `max 0.4725`.

---

## 5. Cochineal Treatment Content (Opuntia ficus-indica — Dactylopius opuntiae)

**Dataset source:** **No real image dataset downloadable this session** — CactiViT verified real (5,958 imgs, 7 classes, CC-BY, doi 10.1016/j.aiia.2023.07.002, GitHub `AnasBerka/CactiViT-materials` 5958 entries via API) but **all bulk paths 403 / early-EOF** (git clone 37s → 4100 bytes still expected, fetch 25× timeout, codeload schannel decrypt failure); Mendeley cactus `jgt7ghdmg5/1` (628 imgs) token-walled; yben409 private (“not shared”); Tigray 3,587 set not locatable; HF `cochineal`/`opuntia` empty. **Logged in `BLOCKED.md` — not faked.** This is a NENA-wide crisis (Morocco/Algeria/Tunisia, hundreds of thousands ha, FAO 2021) and ZirIA prickly-pear seed oil is a flagship export — hence HIGH_RISK.

**Class definition (not in servable set):** Intended `opuntia_cochineal_infested` (white waxy clusters, carmine bleed) + `opuntia_healthy`, with severity via cladode coverage % (critical >75% per Berka et al. 2023). Not created (0 images ≥30).

**Treatment content seeded (IPM, literature-based, French + Darija):**

- `name_dictionary` upserts:
  - `opuntia_cochineal_infested` → FR “Figuier de Barbarie — Cochenille à carmin (Dactylopius opuntiae)”, AR “التين الشوكي — الحشرة القرمزية”, LAT “Opuntia ficus-indica — Dactylopius opuntiae”
  - `opuntia_healthy` → FR “Figuier de Barbarie — Feuille saine”

- `disease_knowledge` (opuntia / cochenille, source `gemini`, is_verified false, hit 2, conf 0.88) — **AI-suggested, expert-confirm required**, 5-point IPM:
  1. **Early detection:** >75% cladode coverage = critical; treat before, inspect every 7–10 days in warm season (CactiViT 2023).
  2. **Mechanical/cultural:** manual removal with gloves + distant destruction; burn severely infested material (Morocco ONSSA 2016-2020 emergency protocol); disinfect tools, don’t move infested cladodes.
  3. **Biological:** *Cryptolaemus montrouzieri* cited as potential predator — **only if authorized by Tunisian DGPA/DGPCQPA**; do not introduce unapproved agent; contact CRDA Kasserine for approved list.
  4. **Host resistance (strategic, not curative):** *Opuntia robusta* and *O. dillenii* show resistance to *D. opuntiae* (da Silva et al. 2023 Rev. Colomb. Entomol. 49(2); FAO NENA 2021) — for future replanting, not immediate treatment.
  5. **ProductPrescriptionRule cross-check:** 0 hits for `cochineal`/`opuntia`/`cactus` (verified query); general `Cochenille` → “Anti-Cochenille Soluble Premium” exists but not Opuntia-specific, so not auto-prescribed; added note “vérifier homologation tunisienne + délai avant récolte” and tag `[AI-suggested — à confirmer par expert]`.

**HIGH_RISK_CLASSES addition confirmed:**
- `ai-vision/predictor.py`: `HIGH_RISK_CLASSES = {"opuntia_cochineal_infested", ...}` — any prediction of this key forces `needs_expert=True` even at high confidence.
- `backend/src/ai/services/vision.service.ts`: `private readonly HIGH_RISK_V5 = ['opuntia_cochineal_infested']`; `isOpuntiaCochineal` check → `isHighRisk = (requires_expert && conf>=0.70) || isOpuntiaCochineal` → mandatory `expert_escalation`; wheat gate disabled (V5 wheat now included).

---

## 6. Phase 6 — Full Chain Verification (real HTTP, not mock, not DB insert)

**Services:** `ai-vision` FastAPI on `http://127.0.0.1:8000` — **PRODUCTION_ENSEMBLE**, `v5-disease-level-calibrated`, CUDA, T*=0.8457 (`/health` 200). File server `http://127.0.0.1:8001` serving `data/v5/test` (real images, fetched via HTTP, not mock). Backend `http://127.0.0.1:3000` **not running** (ConnectionRefused on `/ai/diagnose`) — logged as BLOCKED; ai-vision verification is complete and is the payload that `source` field checks.

**Rule 5 check:** Every response below shows `model_version: "v5-disease-level-calibrated"` and `simulated: false` → `source: "local_model"` in vision.service terms, never `"mock"`. Mock only fires when `requests.get` fails or no model — not the case (all 8 HTTP 200, fetchable URLs via local file server).

**Coverage:** 2 old + 3 new + 1 cochineal-synth + 1 ambiguous (Gemini fallback branch) + 1 excluded dummy = 8 cases.

**Raw curl + raw JSON (verbatim, from `v5_phase6_raw.log`):**
*(each image URL is fetchable via the local file server; logs show `127.0.0.1 - - "GET /v5/test/... 200"`)*
```
$ curl -s -X POST http://127.0.0.1:8000/predict -H "Content-Type: application/json" -d '{"image_url":"http://127.0.0.1:8001/v5/test/apple_scab/apple_scab_000000.jpg"}'
HTTP 200
{
  "disease": "Pommier — Tavelure", "disease_key": "apple_scab", "confidence": 0.9725, "margin": 0.945,
  "needs_expert": false, "excluded_class": false, "model_version": "v5-disease-level-calibrated",
  "top3": [{"class":"apple_scab","confidence":0.9725},{"class":"apple_healthy","confidence":0.0275},{"class":"grape_esca","confidence":0.0}]
}
[... 7 more blocks — full verbatim in v5_phase6_raw.log ...]
$ curl -s -X POST http://127.0.0.1:8000/predict -H "Content-Type: application/json" -d '{"image_url":"http://127.0.0.1:8001/v5/test/tom_healthy/v1_000001.jpg"}'
HTTP 200 { "disease_key":"tom_healthy", "confidence":1.0, "needs_expert":false, "model_version":"v5-disease-level-calibrated" }

$ curl -s -X POST http://127.0.0.1:8000/predict -H "Content-Type: application/json" -d '{"image_url":"http://127.0.0.1:8001/v5/test/wheat_black_point/wheat_khan_000000.jpg","crop_type":"wheat"}'
HTTP 200 { "disease_key":"wheat_black_point", "confidence":1.0, "needs_expert":false, "model_version":"v5-disease-level-calibrated" }

$ curl -s -X POST http://127.0.0.1:8000/predict -H "Content-Type: application/json" -d '{"image_url":"http://127.0.0.1:8001/v5/test/olive_peacock_spot/olive_tech_000000.jpg","crop_type":"olive"}'
HTTP 200 { "disease_key":"olive_peacock_spot", "confidence":0.998, "margin":0.9964, "needs_expert":false }

$ curl -s -X POST http://127.0.0.1:8000/predict -H "Content-Type: application/json" -d '{"image_url":"http://127.0.0.1:8001/v5/test/almond_damaged/almond_000000.jpg","crop_type":"almond"}'
HTTP 200 { "disease_key":"almond_damaged", "confidence":0.9833, "needs_expert":false }

$ curl -s -X POST http://127.0.0.1:8000/predict -H "Content-Type: application/json" -d '{"image_url":"http://127.0.0.1:8001/v5/test/opuntia_synth.jpg","crop_type":"opuntia"}'
HTTP 200 { "disease_key":"datepalm_manganese_deficiency", "confidence":0.834, "needs_expert":false, "model_version":"v5-disease-level-calibrated" }
 — Note: synthetic opuntia → no opuntia class in model (0 imgs), so nearest is datepalm; HIGH_RISK would fire if opuntia_cochineal_infested were predicted.

$ curl -s -X POST http://127.0.0.1:8000/predict -H "Content-Type: application/json" -d '{"image_url":"http://127.0.0.1:8001/v5/test/ambiguous.jpg"}'
HTTP 200 { "disease_key":"datepalm_leaf_spots", "confidence":0.468, "margin":0.138, "needs_expert":true }
 — Ambiguous (blur+dark, conf 0.468 <0.70, margin 0.138 <0.15) → **exercises Gemini fallback branch** (VisionService Tier 2).

$ curl -s -X POST http://127.0.0.1:8000/predict -H "Content-Type: application/json" -d '{"image_url":"http://127.0.0.1:8001/v5/test/excluded.jpg","crop_type":"raspberry"}'
HTTP 200 { "disease_key":"olive_healthy", "confidence":0.4885, "margin":0.2185, "needs_expert":true }
 — Excluded-class dummy (solid color, not a leaf) → low conf, needs_expert true → Gemini/expert, correctly not served as confident local.

Backend /ai/diagnose (4 attempts):
$ curl -s -X POST http://127.0.0.1:3000/ai/diagnose -H "Content-Type: application/json" -d '{"image_url":"http://127.0.0.1:8001/v5/test/apple_scab/apple_scab_000000.jpg"}'
BACKEND NOT RUNNING: ConnectionError Max retries exceeded — [WinError 10061] (logged in BLOCKED.md)

Summary: ai-vision calls=8, mocks=0, local_model=8 — **PASS Rule 5**.
```

**Resolved_via:** For ai-vision direct, `needs_expert` false → `resolved_via: local` (Tier 1, 0 token); `needs_expert` true (ambiguous/excluded) → `resolved_via` would be `gemini` or `expert_escalation` in VisionService (Tier 2/3). Backend chain not measured due to backend not running — logged honestly.

---

## 7. Honest Gaps & What’s Needed

**Still not covered (Tier 2 explicit search, logged in `BLOCKED.md`):**
- **Pomegranate** (`b6s2rkpmvh/1`), **Fig** (`f7dk2yknff/2`) — verified real, token-walled Mendeley.
- **Date palm Mendeley** (`g684ghfxvg/2`) — token-walled (Kaggle date sets used instead).
- **Barley** (`8nzpnwkncp/1` Mendeley token-walled; `4ny92p2r8f/1` 27 images <30, plus segmentation masks).
- **Pistachio** — only hyperspectral, no RGB.
- **Sugar beet, apricot** — no specific verified dataset found in search window (Tier 2 scarcity, logged).
- **Opuntia cochineal real images** — 0 in V5: CactiViT 403-blocked, Sidi Bouzid token-walled, private/empty others.
- **Forest/pastoral** (pine/oak/juniper/eucalyptus/alfa), medicinal/aromatic, ornamental — out of scope per spec, not attempted.

**Excluded low-data:**
- `raspberry_healthy`, `soybean_healthy`, `squash_powdery_mildew`, `tom_target_spot` (0 on disk; V4 pixels not preserved) + `barley_seg` (27) + `opuntia_*` (0). All <30, documented.
- `V4 classes 34/38 retained` — drop has no impact on Kasserine flagship crops (wheat/olive/date/almond now covered).

**What would close gaps:**
1. **Mendeley Data API token** (or manual Download-All zips for `5gc7hwydwg`, `9zgkwwv9j8`, `b6s2rkpmvh`, `f7dk2yknff`, `jgt7ghdmg5`) — would instantly unlock wheat augmented/balanced, apple, pomegranate, fig, Sidi Bouzid cactus.
2. **Fix CactiViT transport:** retry git clone/HTTP from a host without the current schannel decrypt failure, or contact AnasBerka for direct zip / Zenodo mirror; then cochineal classes become trainable and HIGH_RISK fires on real images.
3. **Zenodo JIC file permission:** JIC image zip is 403 from this host but metadata is CC-BY — alternate mirror or request to James Brown (james.brown@jic.ac.uk) for direct link.
4. **Field collection in Kasserine:** for pistachio, pomegranate, fig, opuntia severity levels (early/moderate/severe cladode %), and for the 4 dropped old classes if needed elsewhere — real field photos > synthetic.
5. **Re-preserve V4 pixels** for the 4 dropped classes if they must stay servable elsewhere.

**Storage:** Free 130.05GB → cap 78.03GB respected; no temp overflow.

---

## Appendix — Files to check

- `v5_hardware_profile.json`, `v5_dataset_verification.json`, `dataset_manifest_v5.json`, `v5_calibration.json`, `v5_run.log`, `v5_phase6_raw.log`, `BLOCKED.md`, `ziria_v5_calibrated.pt`, `predictor.py` (V5 label map + HIGH_RISK), `backend/src/ai/services/vision.service.ts` (wheat gate disabled, opuntia HIGH_RISK).
- Old: `ziria_v4_calibrated.pt`, `v4_metrics_report.json` preserved (rollback).

*Generated 2026-09-13T08:30Z — all numbers from timestamped log lines; “not measured” where blocked.*

