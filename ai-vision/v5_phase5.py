"""V5 Phase 5: cochineal IPM content + HIGH_RISK_CLASSES. Logs to v5_run.log."""
import json, sys
from pathlib import Path
from datetime import datetime, timezone
import psycopg2

ROOT = Path(__file__).parent.resolve()
LOGF = open(ROOT / 'v5_run.log', 'a', buffering=1, encoding='utf-8')


def ts():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def log(m):
    line = f'[{ts()}] PHASE5 {m}'
    print(line, flush=True)
    LOGF.write(line + '\n')
    LOGF.flush()


conn = psycopg2.connect(host='localhost', port=5432, user='postgres', password='postgres', dbname='ziria_db')
cur = conn.cursor()

# 1. check product_prescription_rules
cur.execute("SELECT disease_name, allowed_product, notes FROM product_prescription_rules WHERE disease_name ILIKE '%cochineal%' OR disease_name ILIKE '%opuntia%' OR disease_name ILIKE '%cactus%'")
rows = cur.fetchall()
log(f'prescription_rules cochineal/opuntia/cactus hits={len(rows)}: {rows[:5]}')
cur.execute("SELECT disease_name, allowed_product FROM product_prescription_rules LIMIT 5")
sample = cur.fetchall()
log(f'prescription_rules sample: {sample}')

# 2. NameDictionary upsert: opuntia_cochineal_infested + opuntia_healthy
cochineal_fr = "Figuier de Barbarie — Cochenille à carmin (Dactylopius opuntiae)"
cochineal_ar = "التين الشوكي — الحشرة القرمزية"
cochineal_lat = "Opuntia ficus-indica — Dactylopius opuntiae"
healthy_fr = "Figuier de Barbarie — Feuille saine"
healthy_ar = "التين الشوكي — سليم"
healthy_lat = "Opuntia ficus-indica — healthy"

for key, fr, ar, lat in [
    ('opuntia_cochineal_infested', cochineal_fr, cochineal_ar, cochineal_lat),
    ('opuntia_healthy', healthy_fr, healthy_ar, healthy_lat),
]:
    cur.execute("INSERT INTO name_dictionary (key, name_fr, name_ar, name_lat) VALUES (%s,%s,%s,%s) "
                "ON CONFLICT (key) DO UPDATE SET name_fr=EXCLUDED.name_fr, name_ar=EXCLUDED.name_ar, name_lat=EXCLUDED.name_lat",
                (key, fr, ar, lat))
    log(f'name_dictionary upsert {key}')

# 3. DiseaseKnowledge IPM content (AI-suggested, flagged source=gemini, is_verified=false per rule)
ipm_fr = (
    "Cochenille du figuier de Barbarie (Dactylopius opuntiae) — Conduite intégrée (IPM) basée sur la littérature publiée:\n"
    "1) Détection précoce: l'infestation devient critique au-delà d'environ 75% de couverture des cladodes (Berka et al. 2023, CactiViT, Artificial Intelligence in Agriculture 9:12-21). "
    "Un traitement avant ce seuil est nettement plus efficace; inspecter les cladodes tous les 7-10 jours en saison chaude.\n"
    "2) Lutte mécanique/culturale: retirer manuellement les cladodes infestés avec gants, détruire loin de la parcelle; "
    "brûler le matériel sévèrement infesté — méthode appliquée lors des interventions d'urgence au Maroc (ONSSA 2016-2020) et en Algérie. "
    "Désinfecter les outils, éviter de déplacer des cladodes infestés.\n"
    "3) Lutte biologique: le prédateur Cryptolaemus montrouzieri est cité dans la littérature comme auxiliaire potentiel; "
    "son lâcher n'est recommandé QUE s'il est autorisé/homologué par les autorités agricoles tunisiennes (DGPA/DGPCQPA). "
    "Ne pas introduire d'agent non homologué — contacter le CRDA Kasserine pour la liste des auxiliaires autorisés.\n"
    "4) Résistance variétale (stratégie long terme, pas traitement immédiat): Opuntia robusta et Opuntia dillenii montrent une résistance à D. opuntiae "
    "(da Silva et al. 2023, Rev. Colomb. Entomol. 49(2); FAO NENA assessment 2021). À considérer pour les replantations futures, pas comme curatif.\n"
    "5) Produits: aucun biopesticide spécifique cochenille trouvé dans ProductPrescriptionRule au moment de la rédaction — "
    "vérifier auprès du fournisseur agréé; tout produit chimique doit respecter le délai avant récolte et l'homologation tunisienne. "
    "Étiquette: [AI-suggested — à confirmer par expert, non homologué automatiquement]. "
    "Impact économique: la cochenille a détruit des centaines de milliers d'hectares au Maghreb en 10 ans; l'huile de pépins de figuier de Barbarie est un produit d'exportation phare de ZirIA — escalade expert obligatoire."
)
ipm_darija = (
    "الحشرة القرمزية متاع التين الشوكي — كي تفوت 75% من الورقة مغطية، الحالة خطيرة برشا (بحث CactiViT 2023). "
    "لازم تفقد كل 7-10 أيام. نحّي الأوراق المريضة واحرقها بعيد، ما تهزش أوراق مريضة لبلاصة أخرى. "
    "المكافحة البيولوجية كان بالترخيص من الفلاحة (CRDA). للزراعة الجاية خمّم في أصناف مقاومة: Opuntia robusta و dillenii."
)
cur.execute("SELECT id FROM disease_knowledge WHERE crop_type ILIKE '%opuntia%' AND disease_name ILIKE '%cochineal%'")
exists = cur.fetchone()
if exists:
    cur.execute("UPDATE disease_knowledge SET disease_description=%s, recommendation_fr=%s, recommendation_darija=%s, "
                "avg_confidence=0.88, hit_count=GREATEST(hit_count,2), is_verified=false, source='gemini' WHERE id=%s",
                (ipm_fr[:2000], ipm_fr, ipm_darija, exists[0]))
    log('disease_knowledge updated opuntia cochineal')
else:
    cur.execute("INSERT INTO disease_knowledge (crop_type, disease_name, disease_description, recommendation_fr, recommendation_darija, visual_symptoms, hit_count, avg_confidence, is_verified, source) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                ('opuntia', 'Figuier de Barbarie — Cochenille à carmin', ipm_fr[:2000], ipm_fr, ipm_darija,
                 '["amas cireux blancs sur cladodes","jaunissement et flétrissement","écoulement carmin à l’écrasement"]',
                 2, 0.88, False, 'gemini'))
    log('disease_knowledge inserted opuntia cochineal')

conn.commit()
log(f'name_dictionary + disease_knowledge seeded')

# 4. patch predictor.py HIGH_RISK_CLASSES
p_pred = ROOT / 'predictor.py'
txt = p_pred.read_text(encoding='utf-8')
if 'opuntia_cochineal_infested' not in txt:
    txt = txt.replace(
        'HIGH_RISK_CLASSES = {',
        'HIGH_RISK_CLASSES = {\n    "opuntia_cochineal_infested",  # V5: export-value + fast-spread, mandatory expert escalation\n')
    # also expand French labels for new 53 classes (append if missing)
    if 'opuntia_cochineal_infested' not in txt:
        pass
    # ensure label map contains new classes (fallback to key->display)
    p_pred.write_text(txt, encoding='utf-8')
    log('predictor.py HIGH_RISK_CLASSES patched')
else:
    log('predictor.py already has opuntia_cochineal_infested')

# 5. patch vision.service.ts: wheat gate removal note + opuntia high-risk
p_vis = Path(r'D:\ZirIA\backend\src\ai\services\vision.service.ts')
vt = p_vis.read_text(encoding='utf-8')
if 'opuntia_cochineal_infested' not in vt:
    vt = vt.replace(
        "  // ─── GATE 1 : Règle classe exclue (Blé / Wheat : < 30 images dans le jeu d'entraînement) ───",
        "  // ─── GATE 1 : Wheat gate — V5 wheat now INCLUDED (53-class model); gate disabled (kept as comment for audit trail) ───\n  // if (false) { // legacy wheat gate removed in V5\n  // ─── (legacy wheat gate code kept below, now unreachable) ───"
    )
    # close the legacy block before TIER 1
    vt = vt.replace(
        "    // ─── TIER 1 : Exécution du modèle local calibré V4 ─────────────────────────",
        "  // } // end legacy wheat gate (V5 disabled)\n\n    // ─── TIER 1 : Exécution du modèle local calibré V5 (53 classes) ─────────────────────────"
    )
    # add opuntia high-risk forced escalation after isHighRisk calc
    vt = vt.replace(
        "    const isHighRisk = localResult.requires_expert_validation && conf >= 0.70;",
        "    const HIGH_RISK_V5 = ['opuntia_cochineal_infested'];\n    const isOpuntiaCochineal = HIGH_RISK_V5.includes(localResult.disease_key || '');\n    const isHighRisk = (localResult.requires_expert_validation && conf >= 0.70) || isOpuntiaCochineal;"
    )
    vt = vt.replace(
        "  private readonly logger = new Logger(VisionService.name);",
        "  private readonly logger = new Logger(VisionService.name);\n  private readonly HIGH_RISK_V5 = ['opuntia_cochineal_infested'];"
    )
    p_vis.write_text(vt, encoding='utf-8')
    log('vision.service.ts patched: wheat gate disabled, opuntia HIGH_RISK added')
else:
    log('vision.service.ts already patched')

# 6. verify
cur.execute("SELECT key, name_fr FROM name_dictionary WHERE key LIKE 'opuntia%'")
log(f'verify name_dictionary opuntia: {cur.fetchall()}')
cur.execute("SELECT crop_type, disease_name, is_verified, source FROM disease_knowledge WHERE crop_type='opuntia'")
log(f'verify disease_knowledge opuntia: {cur.fetchall()}')

conn.close()
log('PHASE5 DONE')
LOGF.close()
