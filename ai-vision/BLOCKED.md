# ZirIA v3 — blocked / degraded items (honest log)

- [2026-09-11T02:16:34Z] HF leoho36/plant_village_dataset load failed: ReadError [SSL: DECRYPTION_FAILED_OR_BAD_RECORD_MAC] decryption failed or bad record mac (_ssl.c:2658)
- [2026-09-11T02:16:36Z] HF BrandonFors/Plant-Diseases-PlantVillage-Dataset load failed: HfHubHTTPError (Request ID: Root=1-6aa36482-5f86a7b8741e4e89586c7846;ac6c382f-6cf7-42d1-98cd-9af8bec036b4)

429 Too Many Requests: you have reached your 'api' rate l
- [2026-09-11T04:08:02Z] PV parquet yielded only 0; falling back to per-file tree fetch
- [2026-09-12T23:20:22Z] Mendeley 5gc7hwydwg/1 (wheat): verified real but NO programmatic bulk download (JS-only Download-All, public API needs token). Excluded from V5 bulk pipeline.
- [2026-09-12T23:20:22Z] Mendeley 9zgkwwv9j8/4 (apple): verified real but NO programmatic bulk download (JS-only Download-All, public API needs token). Excluded from V5 bulk pipeline.
- [2026-09-12T23:20:22Z] Mendeley b6s2rkpmvh/1 (pomegranate): verified real but NO programmatic bulk download (JS-only Download-All, public API needs token). Excluded from V5 bulk pipeline.
- [2026-09-12T23:20:22Z] Mendeley f7dk2yknff/2 (fig): verified real but NO programmatic bulk download (JS-only Download-All, public API needs token). Excluded from V5 bulk pipeline.
- [2026-09-12T23:20:22Z] Mendeley g684ghfxvg/2 (date palm): verified real but NO programmatic bulk download (JS-only Download-All, public API needs token). Excluded from V5 bulk pipeline.
- [2026-09-12T23:20:22Z] Mendeley 8nzpnwkncp/1 (barley): verified real but NO programmatic bulk download (JS-only Download-All, public API needs token). Excluded from V5 bulk pipeline.
- [2026-09-12T23:20:22Z] Mendeley jgt7ghdmg5/1 (cactus/sidi bouzid): verified real but NO programmatic bulk download (JS-only Download-All, public API needs token). Excluded from V5 bulk pipeline.
- [2026-09-12T23:20:22Z] HyperPistachio (zenodo 14213013/20027441): verified real but hyperspectral NUT cubes (aflatoxin nuts, .mat-style), wrong modality+organ for RGB leaf-photo classifier. Excluded.
- [2026-09-12T23:20:22Z] Figshare OQDS-Insight: verified real but GIS shapefiles (.shp/.dbf points), no leaf photos. Excluded.
- [2026-09-12T23:20:59Z] CactiViT git clone failed; trying codeload zip
- [2026-09-12T23:49:48Z] UPV discovery failed: expected string or bytes-like object, got 'NoneType'
- [2026-09-13T00:02:50Z] JIC wheat (zenodo 7573133): metadata verified (999 imgs, yellow/brown rust, septoria, mildew, healthy, CC-BY-4.0) but ALL file-download URL forms return HTTP 403 from this host. Excluded from V5; wheat covered by khanaamer Kaggle set.
- [v5-merge] barley_seg: 27 raw images, no class mapping applied (would need >=30 + verified RGB leaf content); excluded.
- [v5-merge] opuntia image data: 0 images downloadable this session (CactiViT repo verified: 5958 imgs in 7 folders, but clone/fetch/codeload all failed on transport; Mendeley cactus token-walled; Tigray set not locatable; yben409 private; HF empty). Classes NOT created; Phase-5 treatment content still seeded from literature.
- [v5-merge] V4 classes raspberry_healthy/soybean_healthy/squash_powdery_mildew/tom_target_spot: 0 images on disk (V4 training pixels not preserved); excluded from V5 servable set, old-subset eval covers remaining 34.
- [2026-09-13T08:24:29Z] PHASE6 cochineal image: synthetic (no real cochineal dataset downloadable; CactiViT verified 5958 imgs but 403-blocked). HIGH_RISK escalation seeded via NameDictionary/DiseaseKnowledge.
- [2026-09-13T08:24:29Z] PHASE6 ambiguous/excluded: synthetic blur/dummy to exercise Gemini fallback branch; real field hard-set accuracy reported separately in calibration (hard 91.49%).
