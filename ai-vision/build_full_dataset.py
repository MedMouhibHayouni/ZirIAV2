import os, shutil, io, json, random
from pathlib import Path
import pandas as pd
from PIL import Image

random.seed(42)

ZIRIA_CLASSES = {
    "Tomate_Feuille_Saine": [("Tomato", "healthy", "parquet")],
    "Tomate_Mildiou_precoce": [("Tomato", "Early blight", "parquet")],
    "Tomate_Mildiou_tardif": [("Tomato", "Late blight", "parquet")],
    "Tomate_Septoriose": [("Tomato", "Septoria leaf spot", "parquet")],
    "Tomate_Tache_bacterienne": [("Tomato", "Bacterial spot", "parquet")],
    "Tomate_Acarien": [("Tomato", "Spider mites Two-spotted spider mite", "parquet")],
    "Tomate_Moisissure_foliaire": [("Tomato", "Leaf Mold", "parquet")],
    "Tomate_Virus_mosaique": [("Tomato", "Tomato mosaic virus", "parquet")],
    "Tomate_TYLCV": [("Tomato", "Tomato Yellow Leaf Curl Virus", "parquet")],
    "Pomme_de_terre_Feuille_Saine": [("Potato", "healthy", "parquet")],
    "Pomme_de_terre_Mildiou_precoce": [("Potato", "Early blight", "parquet")],
    "Pomme_de_terre_Mildiou_tardif": [("Potato", "Late blight", "parquet")],
    "Poivron_Feuille_Saine": [("Pepper, bell", "healthy", "parquet")],
    "Poivron_Tache_bacterienne": [("Pepper, bell", "Bacterial spot", "parquet")],
    "Mais_Feuille_Saine": [("Corn (maize)", "healthy", "parquet")],
    "Mais_Rouille_commune": [("Corn (maize)", "Common rust", "parquet")],
    "Mais_Tache_cercospora": [("Corn (maize)", "Cercospora leaf spot Gray leaf spot", "parquet")],
    "Mais_Brulure_nord": [("Corn (maize)", "Northern Leaf Blight", "parquet")],
    "Olivier_Deficience_Nutritionnelle": [("olive", "deficiencia", "olive")],
    "Olivier_Fumagine": [("olive", "negrilla", "olive")],
    "Olivier_Virose": [("olive", "virosis", "olive")],
    "Pomme_Feuille_Saine": [("Apple", "healthy", "parquet")],
    "Pomme_Tavelure": [("Apple", "Apple scab", "parquet")],
    "Pomme_Pourriture_noire": [("Apple", "Black rot", "parquet")],
    "Pomme_Rouille": [("Apple", "Cedar apple rust", "parquet")],
    "Raisin_Feuille_Saine": [("Grape", "healthy", "parquet")],
    "Raisin_Pourriture_noire": [("Grape", "Black rot", "parquet")],
    "Raisin_Esca": [("Grape", "Esca (Black Measles)", "parquet")],
    "Raisin_Brulure_isariopsis": [("Grape", "Leaf blight (Isariopsis Leaf Spot)", "parquet")],
    "Peche_Feuille_Saine": [("Peach", "healthy", "parquet")],
    "Peche_Tache_bacterienne": [("Peach", "Bacterial spot", "parquet")],
    "Fraise_Feuille_Saine": [("Strawberry", "healthy", "parquet")],
    "Fraise_Brulure_foliaire": [("Strawberry", "Leaf scorch", "parquet")],
    "Cerisier_Feuille_Saine": [("Cherry (including sour)", "healthy", "parquet")],
    "Cerisier_Oidium": [("Cherry (including sour)", "Powdery mildew", "parquet")],
}

DATA_DIR = Path("data/full_dataset")
PARQUET = Path("data/plantvillage_tiny.parquet")
OLIVE_DIR = Path("data/olive")
OLD_DATASET = Path("data/dataset")
TRAIN_RATIO = 0.70
VAL_RATIO = 0.15

def extract_parquet_images(df):
    cache = {}
    for _, row in df.iterrows():
        key = (row["host"], row["disease"])
        img = Image.open(io.BytesIO(row["image"]["bytes"])).convert("RGB")
        cache.setdefault(key, []).append(img)
    return cache

def extract_olive_images(olive_dir):
    cache = {}
    for split in ["train", "valid", "test"]:
        sp = olive_dir / split
        if not sp.exists():
            continue
        for cls_name in os.listdir(sp):
            cls_path = sp / cls_name
            if not cls_path.is_dir():
                continue
            for f in cls_path.iterdir():
                if f.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
                    try:
                        cache.setdefault(cls_name, []).append(Image.open(f).convert("RGB"))
                    except Exception:
                        pass
    return cache

def save_split(images, out_dir, cls_name):
    out_dir.mkdir(parents=True, exist_ok=True)
    for i, img in enumerate(images):
        img.save(out_dir / f"{cls_name}_{i:04d}.jpg", "JPEG", quality=92)

def build_dataset():
    print("=" * 60)
    print("ZirIA Full Dataset Builder")
    print("=" * 60)
    df = pd.read_parquet(PARQUET)
    print(f"Parquet: {len(df)} rows")
    parquet_cache = extract_parquet_images(df)
    print(f"Parquet: {len(parquet_cache)} combos, {sum(len(v) for v in parquet_cache.values())} images")
    olive_cache = extract_olive_images(OLIVE_DIR)
    for k, v in olive_cache.items():
        print(f"  olive/{k}: {len(v)}")

    ble_dur_extra = {}
    for cls in ["Ble_dur_Feuille_Saine", "Ble_dur_Rouille_jaune"]:
        old_train = OLD_DATASET / "train" / cls
        if old_train.exists():
            imgs = []
            for f in old_train.iterdir():
                if f.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
                    try:
                        imgs.append(Image.open(f).convert("RGB"))
                    except Exception:
                        pass
            if imgs:
                ble_dur_extra[cls] = imgs
                print(f"  old/{cls}: {len(imgs)}")

    if DATA_DIR.exists():
        shutil.rmtree(DATA_DIR)
    DATA_DIR.mkdir(parents=True)

    class_stats = {}
    all_class_map = dict(ZIRIA_CLASSES)
    for cls in ble_dur_extra:
        if cls not in all_class_map:
            all_class_map[cls] = None

    for cls_name, sources in all_class_map.items():
        if sources is None:
            all_imgs = list(ble_dur_extra.get(cls_name, []))
        else:
            all_imgs = []
            for (host, disease, source) in sources:
                if source == "parquet":
                    all_imgs.extend(parquet_cache.get((host, disease), []))
                elif source == "olive":
                    all_imgs.extend(olive_cache.get(disease, []))

        if not all_imgs:
            print(f"  SKIP {cls_name}: no images")
            continue

        random.shuffle(all_imgs)
        n = len(all_imgs)
        n_train = max(1, int(n * TRAIN_RATIO))
        n_val = max(1, int(n * VAL_RATIO))
        n_test = n - n_train - n_val
        if n_test < 1:
            n_train -= 1
            n_test = 1

        save_split(all_imgs[:n_train], DATA_DIR / "train" / cls_name, cls_name)
        save_split(all_imgs[n_train:n_train + n_val], DATA_DIR / "val" / cls_name, cls_name)
        save_split(all_imgs[n_train + n_val:], DATA_DIR / "test" / cls_name, cls_name)

        class_stats[cls_name] = {"train": n_train, "val": n_val, "test": n_test}
        print(f"  OK {cls_name}: train={n_train}, val={n_val}, test={n_test}")

    total_train = sum(v["train"] for v in class_stats.values())
    total_val = sum(v["val"] for v in class_stats.values())
    total_test = sum(v["test"] for v in class_stats.values())
    print(f"\nDataset: {len(class_stats)} classes")
    print(f"  train={total_train}, val={total_val}, test={total_test}, total={total_train+total_val+total_test}")

    classes = sorted(class_stats.keys())
    os.makedirs("models", exist_ok=True)
    with open("models/classes_full.json", "w") as f:
        json.dump({"classes": classes, "num_classes": len(classes), "stats": class_stats}, f, indent=2)
    print("Manifest -> models/classes_full.json")
    return classes, class_stats

if __name__ == "__main__":
    build_dataset()
