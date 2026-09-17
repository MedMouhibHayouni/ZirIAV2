"""Seed name_dictionary with the 38 disease-level classes."""
import psycopg2
from datetime import datetime, timezone

DISEASES_SEED = [
    ("apple_black_rot", "Pommier — Pourriture noire", "تعفن أسود للتفاح", "Botryosphaeria obtusa"),
    ("apple_cedar_rust", "Pommier — Rouille du genévrier", "صدأ التفاح", "Gymnosporangium juniperi-virginianae"),
    ("apple_healthy", "Pommier — Feuille saine", "تفاح سليم", "Malus domestica"),
    ("apple_scab", "Pommier — Tavelure", "جرب / تافيلير التفاح", "Venturia inaequalis"),
    ("cherry_healthy", "Cerisier — Feuille saine", "حب الملوك سليم", "Prunus avium"),
    ("cherry_powdery_mildew", "Cerisier — Oïdium", "بياض دقيقي لحب الملوك", "Podosphaera clandestina"),
    ("corn_cercospora_leaf_spot", "Maïs — Tache grise cercosporéenne", "تبقع رمادي للقطانية", "Cercospora zeae-maydis"),
    ("corn_common_rust", "Maïs — Rouille commune", "صدأ القطانية", "Puccinia sorghi"),
    ("corn_healthy", "Maïs — Feuille saine", "قطانية سليمة", "Zea mays"),
    ("corn_northern_leaf_blight", "Maïs — Brûlure helminthosporienne", "حراق ورق القطانية", "Exserohilum turcicum"),
    ("grape_black_rot", "Vigne — Pourriture noire", "تعفن أسود للعنب", "Guignardia bidwellii"),
    ("grape_esca", "Vigne — Esca", "إسكا الدالية", "Fomitiporia mediterranea"),
    ("grape_healthy", "Vigne — Feuille saine", "دالية سليمة", "Vitis vinifera"),
    ("grape_leaf_blight", "Vigne — Brûlure foliaire", "حراق أوراق العنب", "Pseudocercospora vitis"),
    ("olive_diseased", "Olivier — Maladie foliaire (Oeil de paon / Acariose)", "عين الطاووس للزيتون", "Spilocaea oleaginea"),
    ("olive_healthy", "Olivier — Feuille saine", "زيتون سليم", "Olea europaea"),
    ("peach_bacterial_spot", "Pêcher — Tache bactérienne", "ضربة بكتيرية للخوخ", "Xanthomonas arboricola"),
    ("peach_healthy", "Pêcher — Feuille saine", "خوخ سليم", "Prunus persica"),
    ("pep_bacterial_spot", "Poivron — Tache bactérienne", "ضربة بكتيرية للفلفل", "Xanthomonas campestris"),
    ("pep_healthy", "Poivron — Feuille saine", "فلفل سليم", "Capsicum annuum"),
    ("pot_early_blight", "Pomme de terre — Mildiou précoce (Alternariose)", "الترناريا البطاطا", "Alternaria solani"),
    ("pot_healthy", "Pomme de terre — Feuille saine", "بطاطا سليمة", "Solanum tuberosum"),
    ("pot_late_blight", "Pomme de terre — Mildiou tardif", "ميلديو البطاطا", "Phytophthora infestans"),
    ("raspberry_healthy", "Framboisier — Feuille saine", "توت سليم", "Rubus idaeus"),
    ("soybean_healthy", "Soja — Feuille saine", "صويا سليمة", "Glycine max"),
    ("squash_powdery_mildew", "Courge — Oïdium", "رماد القرع", "Podosphaera xanthii"),
    ("strawberry_healthy", "Fraisier — Feuille saine", "فريز سليم", "Fragaria ananassa"),
    ("strawberry_leaf_scorch", "Fraisier — Brûlure foliaire", "حراق ورق الفريز", "Diplocarpon earlianum"),
    ("tom_bacterial_spot", "Tomate — Tache bactérienne", "بكتيريا الطماطم", "Xanthomonas vesicatoria"),
    ("tom_early_blight", "Tomate — Alternariose", "الترناريا الطماطم", "Alternaria solani"),
    ("tom_healthy", "Tomate — Feuille saine", "طماطم سليمة", "Solanum lycopersicum"),
    ("tom_late_blight", "Tomate — Mildiou", "ميلديو الطماطم", "Phytophthora infestans"),
    ("tom_leaf_mold", "Tomate — Moisissure foliaire", "غمال أوراق الطماطم", "Passalora fulva"),
    ("tom_mosaic_virus", "Tomate — Virus de la mosaïque", "موزاييك الطماطم", "Tomato mosaic virus"),
    ("tom_septoria_leaf_spot", "Tomate — Septoriose", "سيبتوريا الطماطم", "Septoria lycopersici"),
    ("tom_spider_mites", "Tomate — Acariens", "بوفارو / رتيلة الطماطم", "Tetranychus urticae"),
    ("tom_target_spot", "Tomate — Tache cible", "ضربة الهدف للطماطم", "Corynespora cassiicola"),
    ("tom_yellow_leaf_curl", "Tomate — Virus des feuilles jaunes (TYLCV)", "بوكعالة / اصفرار الطماطم", "Tomato yellow leaf curl virus"),
]

conn = psycopg2.connect(host='localhost', port=5432, user='postgres', password='postgres', dbname='ziria_db')
cur = conn.cursor()

inserted = 0
skipped = 0

for key, name_fr, name_ar, name_lat in DISEASES_SEED:
    cur.execute("SELECT id FROM name_dictionary WHERE key = %s;", (key,))
    if cur.fetchone():
        skipped += 1
    else:
        cur.execute("""
            INSERT INTO name_dictionary (id, key, name_fr, name_ar, name_lat, created_at, updated_at)
            VALUES (gen_random_uuid(), %s, %s, %s, %s, now(), now());
        """, (key, name_fr, name_ar, name_lat))
        inserted += 1

conn.commit()
print(f"Seeding completed: {inserted} inserted, {skipped} already present.")

cur.execute("SELECT key, name_fr, name_lat FROM name_dictionary WHERE key LIKE 'tom_%' OR key LIKE 'apple_%' LIMIT 5;")
for row in cur.fetchall():
    print("Sample row:", row)

cur.close()
conn.close()
