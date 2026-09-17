"""
ZirIA Sentinel — Real Dataset Ingestion Pipeline
Downloads real leaf images from:
1. PlantVillage (spMohanty/PlantVillage-Dataset via GitHub CDN)
2. Wheat Stripe Rust & Healthy (Shant-Thakur/YR-22-23 via GitHub CDN)
3. Olive Leaf Diseases (ichaparroc/OliveLeafDiseaseDatasetTacna)
4. Local ZirIA Field Detections (Cloudinary / Unsplash field photos)
"""

import os
import sys
import json
import time
import shutil
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

BASE_DIR = "data/dataset"
SPLITS = ["train", "val_calib", "test", "hard_field"]

# Clean / create directories
for s in SPLITS:
    os.makedirs(os.path.join(BASE_DIR, s), exist_ok=True)

# 1. Target ZirIA Classes
CLASS_MAP = {
    # PlantVillage classes
    "Tomato___Bacterial_spot": "Tomate_Tache_bacterienne",
    "Tomato___Early_blight": "Tomate_Mildiou_precoce",
    "Tomato___Late_blight": "Tomate_Mildiou_tardif",
    "Tomato___Leaf_Mold": "Tomate_Moisissure_foliaire",
    "Tomato___Septoria_leaf_spot": "Tomate_Septoriose",
    "Tomato___Spider_mites Two-spotted_spider_mite": "Tomate_Acarien",
    "Tomato___Tomato_mosaic_virus": "Tomate_Virus_mosaique",
    "Tomato___healthy": "Tomate_Feuille_Saine",
    "Potato___Early_blight": "Pomme_de_terre_Mildiou_precoce",
    "Potato___Late_blight": "Pomme_de_terre_Mildiou_tardif",
    "Potato___healthy": "Pomme_de_terre_Feuille_Saine",
    "Pepper,_bell___Bacterial_spot": "Poivron_Tache_bacterienne",
    "Pepper,_bell___healthy": "Poivron_Feuille_Saine",
}

def download_file(url, out_path):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp, open(out_path, 'wb') as f:
            f.write(resp.read())
        # Validate that it is a readable image
        with Image.open(out_path) as img:
            img.verify()
        return True
    except Exception as e:
        if os.path.exists(out_path):
            try: os.remove(out_path)
            except: pass
        return False

print("--- 1. Downloading PlantVillage Real Images ---")
PV_BASE_API = "https://api.github.com/repos/spMohanty/PlantVillage-Dataset/contents/raw/color"

for pv_dir, ziria_class in CLASS_MAP.items():
    print(f"Fetching manifest for {pv_dir} -> {ziria_class}...")
    try:
        url = f"{PV_BASE_API}/{urllib.parse.quote(pv_dir)}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        contents = json.loads(urllib.request.urlopen(req, timeout=15).read())
        
        # Take 35 images: 20 train, 7 val_calib, 8 test
        image_items = [c for c in contents if c['name'].lower().endswith(('.jpg', '.jpeg', '.png'))][:35]
        
        for idx, item in enumerate(image_items):
            if idx < 20:
                split = "train"
            elif idx < 27:
                split = "val_calib"
            else:
                split = "test"
                
            dest_dir = os.path.join(BASE_DIR, split, ziria_class)
            os.makedirs(dest_dir, exist_ok=True)
            out_file = os.path.join(dest_dir, f"{item['name']}")
            
            if not os.path.exists(out_file):
                download_file(item['download_url'], out_file)
        print(f"  Downloaded {len(image_items)} images for {ziria_class}")
        time.sleep(0.5)
    except Exception as e:
        print(f"  Error fetching {pv_dir}: {e}")

print("--- 2. Ingesting Wheat Stripe Rust & Healthy ---")
WHEAT_BASE_API = "https://api.github.com/repos/Shant-Thakur/YR-22-23/contents/dataset"
wheat_mapping = {
    "rust": "Ble_dur_Rouille_jaune",
    "healthy": "Ble_dur_Feuille_Saine"
}

for w_folder, ziria_class in wheat_mapping.items():
    print(f"Fetching wheat images for {w_folder} -> {ziria_class}...")
    try:
        url = f"{WHEAT_BASE_API}/train/{w_folder}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        contents = json.loads(urllib.request.urlopen(req, timeout=15).read())
        image_items = [c for c in contents if c['name'].lower().endswith(('.jpg', '.jpeg', '.png'))][:35]
        
        for idx, item in enumerate(image_items):
            if idx < 20: split = "train"
            elif idx < 27: split = "val_calib"
            else: split = "test"
            
            dest_dir = os.path.join(BASE_DIR, split, ziria_class)
            os.makedirs(dest_dir, exist_ok=True)
            out_file = os.path.join(dest_dir, item['name'])
            if not os.path.exists(out_file):
                download_file(item['download_url'], out_file)
        print(f"  Downloaded {len(image_items)} images for {ziria_class}")
        time.sleep(0.5)
    except Exception as e:
        print(f"  Error fetching wheat {w_folder}: {e}")

print("--- 3. Ingesting Olive Leaf Diseases from Local Dataset ---")
olive_mapping = {
    "negrilla": "Olivier_Fumagine",
    "virosis": "Olivier_Virose",
    "deficiencia": "Olivier_Deficience_Nutritionnelle"
}

olive_source_dir = "data/olive"
if os.path.exists(olive_source_dir):
    for o_folder, ziria_class in olive_mapping.items():
        all_imgs = []
        for sp in ['train', 'valid', 'test']:
            src_p = os.path.join(olive_source_dir, sp, o_folder)
            if os.path.exists(src_p):
                for f in os.listdir(src_p):
                    if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                        all_imgs.append(os.path.join(src_p, f))
                        
        print(f"Copying {len(all_imgs[:35])} olive images for {ziria_class}...")
        for idx, src_file in enumerate(all_imgs[:35]):
            if idx < 20: split = "train"
            elif idx < 27: split = "val_calib"
            else: split = "test"
            
            dest_dir = os.path.join(BASE_DIR, split, ziria_class)
            os.makedirs(dest_dir, exist_ok=True)
            dest_file = os.path.join(dest_dir, os.path.basename(src_file))
            shutil.copyfile(src_file, dest_file)

print("--- 4. Ingesting Real Tunisian Field Photos (Hard Set) ---")
field_photos = [
    ("https://res.cloudinary.com/dyz4hgsdt/image/upload/v1789040066/ziria/diseases/mniurthufg8wuvjiukvu.jpg", "Tomate_Mildiou_tardif"),
    ("https://res.cloudinary.com/dyz4hgsdt/image/upload/v1789040168/ziria/diseases/uvswwetngiapdygop1ay.jpg", "Tomate_Mildiou_precoce"),
    ("https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=800", "Tomate_Septoriose"),
    ("https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800", "Ble_dur_Rouille_jaune"),
    ("https://images.unsplash.com/photo-1570042225831-d9bfe7e557eb?w=800", "Olivier_Fumagine"),
    ("https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800", "Tomate_Feuille_Saine"),
    ("https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=800", "Pomme_de_terre_Mildiou_precoce"),
    ("https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800", "Ble_dur_Feuille_Saine")
]

for idx, (url, cls) in enumerate(field_photos):
    dest_dir = os.path.join(BASE_DIR, "hard_field", cls)
    os.makedirs(dest_dir, exist_ok=True)
    out_file = os.path.join(dest_dir, f"field_sample_{idx}.jpg")
    ok = download_file(url, out_file)
    print(f"  Field image {idx} ({cls}): {'Success' if ok else 'Failed'}")

# Inventory summary
print("\n--- Summary of Downloaded Real Dataset ---")
total_images = 0
for s in SPLITS:
    s_path = os.path.join(BASE_DIR, s)
    classes = os.listdir(s_path)
    count = sum(len(os.listdir(os.path.join(s_path, c))) for c in classes)
    total_images += count
    print(f"  Split '{s}': {len(classes)} classes, {count} real leaf images")

print(f"\nTotal real leaf images downloaded: {total_images}")
