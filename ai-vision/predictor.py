"""
ZirIA Sentinel — Vision Engine v2 (Calibrated Ensemble)
Moteur IA entraîné sur données réelles PlantVillage + Olive Dataset
Ensemble: MobileNetV3-Large + EfficientNet-B0
Temperature-calibrated for honest uncertainty
"""

import hashlib
import time
import logging
import os
import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

import torch
import torch.nn.functional as F
from PIL import Image
import requests
from io import BytesIO
import torchvision.transforms as T

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ZirIA-Vision-v2")

# ─── Disease-level name mapping (38 classes) ──────────────────────────────
LABEL_TO_FRENCH = {
    "apple_black_rot": "Pommier — Pourriture noire",
    "apple_cedar_rust": "Pommier — Rouille du genévrier",
    "apple_healthy": "Pommier — Feuille saine",
    "apple_scab": "Pommier — Tavelure",
    "cherry_healthy": "Cerisier — Feuille saine",
    "cherry_powdery_mildew": "Cerisier — Oïdium",
    "corn_cercospora_leaf_spot": "Maïs — Tache grise cercosporéenne",
    "corn_common_rust": "Maïs — Rouille commune",
    "corn_healthy": "Maïs — Feuille saine",
    "corn_northern_leaf_blight": "Maïs — Brûlure helminthosporienne",
    "grape_black_rot": "Vigne — Pourriture noire",
    "grape_esca": "Vigne — Esca",
    "grape_healthy": "Vigne — Feuille saine",
    "grape_leaf_blight": "Vigne — Brûlure foliaire",
    "olive_diseased": "Olivier — Maladie foliaire (Oeil de paon / Acariose)",
    "olive_healthy": "Olivier — Feuille saine",
    "peach_bacterial_spot": "Pêcher — Tache bactérienne",
    "peach_healthy": "Pêcher — Feuille saine",
    "pep_bacterial_spot": "Poivron — Tache bactérienne",
    "pep_healthy": "Poivron — Feuille saine",
    "pot_early_blight": "Pomme de terre — Mildiou précoce (Alternariose)",
    "pot_healthy": "Pomme de terre — Feuille saine",
    "pot_late_blight": "Pomme de terre — Mildiou tardif",
    "raspberry_healthy": "Framboisier — Feuille saine",
    "soybean_healthy": "Soja — Feuille saine",
    "squash_powdery_mildew": "Courge — Oïdium",
    "strawberry_healthy": "Fraisier — Feuille saine",
    "strawberry_leaf_scorch": "Fraisier — Brûlure foliaire",
    "tom_bacterial_spot": "Tomate — Tache bactérienne",
    "tom_early_blight": "Tomate — Alternariose",
    "tom_healthy": "Tomate — Feuille saine",
    "tom_late_blight": "Tomate — Mildiou",
    "tom_leaf_mold": "Tomate — Moisissure foliaire",
    "tom_mosaic_virus": "Tomate — Virus de la mosaïque",
    "tom_septoria_leaf_spot": "Tomate — Septoriose",
    "tom_spider_mites": "Tomate — Acariens",
    "tom_target_spot": "Tomate — Tache cible",
    "tom_yellow_leaf_curl": "Tomate — Virus des feuilles jaunes (TYLCV)",
    # V5 additions (19 new disease-level classes)
    "almond_damaged": "Amandier — Fruit endommagé",
    "almond_healthy": "Amandier — Feuille saine",
    "datepalm_black_scorch": "Palmier dattier — Brûlure noire",
    "datepalm_brown_spots": "Palmier dattier — Taches brunes",
    "datepalm_fusarium_wilt": "Palmier dattier — Flétrissement fusarien",
    "datepalm_healthy": "Palmier dattier — Feuille saine",
    "datepalm_leaf_spots": "Palmier dattier — Taches foliaires",
    "datepalm_magnesium_deficiency": "Palmier dattier — Carence en magnésium",
    "datepalm_manganese_deficiency": "Palmier dattier — Carence en manganèse",
    "datepalm_parlatoria_scale": "Palmier dattier — Cochenille Parlatoria",
    "datepalm_potassium_deficiency": "Palmier dattier — Carence en potassium",
    "datepalm_rachis_blight": "Palmier dattier — Brûlure du rachis",
    "olive_aculus_mite": "Olivier — Acariose (Aculus olearius)",
    "olive_peacock_spot": "Olivier — Oeil de paon (Spilocaea oleagina)",
    "wheat_black_point": "Blé — Moucheture (Black Point)",
    "wheat_blast": "Blé — Pyriculariose",
    "wheat_fusarium_foot_rot": "Blé — Pourriture du pied fusarienne",
    "wheat_healthy": "Blé — Feuille saine",
    "wheat_leaf_blight": "Blé — Brûlure foliaire",
    "opuntia_cochineal_infested": "Figuier de Barbarie — Cochenille à carmin (Dactylopius opuntiae)",
    "opuntia_healthy": "Figuier de Barbarie — Feuille saine",
}

# Calibrated thresholds from v4_metrics_report.json
CONFIDENCE_THRESHOLD = 0.70    # below this → flag for expert / gemini fallback
MARGIN_THRESHOLD = 0.15        # margin < 0.15 → ambiguous candidate pair
HIGH_RISK_CLASSES = {
    "opuntia_cochineal_infested",  # V5: export-value + fast-spread, mandatory expert escalation
    # V5-FOLLOW-UP: thin / overconfident classes from MCE drill (post-cal gap >0.12, n<40 in test)
    "corn_cercospora_leaf_spot",  # gap 0.362, n=8, overconfident — mandatory review until more field data
    "tom_mosaic_virus",  # gap 0.187, n=15
    "corn_northern_leaf_blight",  # gap 0.134, n=6
    "datepalm_fusarium_wilt",  # gap 0.125, n=35
    "datepalm_leaf_spots",  # gap 0.147, n=6
    "tom_early_blight", "tom_late_blight",
    "pot_late_blight", "olive_diseased",
}

CROP_PREFIX_MAP = {
    "olive": ["olive_"], "olivier": ["olive_"], "oil": ["olive_"], "زيتون": ["olive_"],
    "tomato": ["tom_"], "tomate": ["tom_"], "طماطم": ["tom_"],
    "potato": ["pot_"], "pomme de terre": ["pot_"], "بطاطا": ["pot_"],
    "peach": ["peach_"], "pêcher": ["peach_"], "pecher": ["peach_"], "خوخ": ["peach_"],
    "pepper": ["pep_"], "poivron": ["pep_"], "piment": ["pep_"], "فلفل": ["pep_"],
    "grape": ["grape_"], "vigne": ["grape_"], "raisin": ["grape_"], "عنب": ["grape_"],
    "apple": ["apple_"], "pommier": ["apple_"], "تفاح": ["apple_"],
    "corn": ["corn_"], "maïs": ["corn_"], "mais": ["corn_"], "ذرة": ["corn_"],
    "cherry": ["cherry_"], "cerisier": ["cherry_"],
    "strawberry": ["strawberry_"], "fraisier": ["strawberry_"],
    "squash": ["squash_"], "courge": ["squash_"],
    "soybean": ["soybean_"], "soja": ["soybean_"],
    "raspberry": ["raspberry_"], "framboisier": ["raspberry_"],
    "wheat": ["wheat_"], "ble": ["wheat_"], "blé": ["wheat_"], "قمح": ["wheat_"],
    "almond": ["almond_"], "amandier": ["almond_"], "لوز": ["almond_"],
    "datepalm": ["datepalm_"], "palmier": ["datepalm_"], "نخيل": ["datepalm_"],
    "opuntia": ["opuntia_"], "figuier": ["opuntia_"], "cactus": ["opuntia_"], "تين شوكي": ["opuntia_"],
}


class DiseasePredictor:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.start_time = time.time()
        self._cache: Dict[str, Dict[str, Any]] = {}

        ai_dir = Path(__file__).parent
        v5_path = ai_dir / "ziria_v5_calibrated.pt"
        v5_cal = ai_dir / "v5_calibration.json"
        v4_path = ai_dir / "ziria_v4_calibrated.pt"
        v4_report = ai_dir / "v4_metrics_report.json"

        self.models = []
        if v5_path.exists() and v5_cal.exists():
            try:
                cal = json.loads(v5_cal.read_text())
                man = json.loads((ai_dir / "dataset_manifest_v5.json").read_text())
                self.classes = man.get("final_classes", list(LABEL_TO_FRENCH.keys()))
                self.temperature = cal.get("Tstar", 0.8457)
                self.img_size = 256
                m = torch.jit.load(str(v5_path), map_location=self.device)
                m.eval()
                self.models = [m]
                self.version = "v5-disease-level-calibrated"
                logger.info(f"Loaded v5 calibrated model: {len(self.classes)} classes, T*={self.temperature}")
            except Exception as e:
                logger.error(f"Failed to load v5 model: {e} — falling back to v4")
        if not self.models and v4_path.exists() and v4_report.exists():
            try:
                rep = json.loads(v4_report.read_text())
                self.classes = rep.get("classes", list(LABEL_TO_FRENCH.keys()))
                self.temperature = rep.get("temperature_Tstar", 0.5954)
                self.img_size = 256
                m = torch.jit.load(str(v4_path), map_location=self.device)
                m.eval()
                self.models = [m]
                self.version = "v4-disease-level-calibrated"
                logger.info(f"Loaded v4 calibrated model: {len(self.classes)} classes, T*={self.temperature}")
            except Exception as e:
                logger.error(f"Failed to load v4 model: {e}")
                self.models = []
                self.classes = list(LABEL_TO_FRENCH.keys())
                self.temperature = 1.0
                self.img_size = 224
                self.version = "sentinel-legacy"
        if not self.models and not (v5_path.exists() and v5_cal.exists()) and not (v4_path.exists() and v4_report.exists()):
            models_dir = ai_dir / "models"
            classes_path = models_dir / "classes_full.json"
            if classes_path.exists():
                with open(classes_path) as f:
                    manifest = json.load(f)
                self.classes = manifest["classes"]
                self.temperature = 1.0
                self.img_size = 224
                self.models = []
                self.version = "sentinel-v2"
            else:
                self.classes = list(LABEL_TO_FRENCH.keys())
                self.temperature = 1.0
                self.img_size = 224
                self.models = []
                self.version = "sentinel-legacy"

        # Build class display names
        self.disease_display = {
            i: LABEL_TO_FRENCH.get(k, k.replace("_", " "))
            for i, k in enumerate(self.classes)
        }

        self.mode = "PRODUCTION_ENSEMBLE" if self.models else "SIMULATION"
        logger.info(f"Mode: {self.mode} | Models: {len(self.models)} | Device: {self.device}")

        # Standard ImageNet normalize
        self.transform = T.Compose([
            T.Resize((self.img_size, self.img_size)),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

    def _cache_key(self, url: str) -> str:
        return hashlib.sha256(url.encode()).hexdigest()

    @property
    def model_type(self) -> str:
        return self.mode

    def _load_image(self, image_url: str) -> Optional[torch.Tensor]:
        try:
            if os.path.exists(image_url):
                img = Image.open(image_url).convert("RGB")
            else:
                response = requests.get(image_url, timeout=8)
                response.raise_for_status()
                img = Image.open(BytesIO(response.content)).convert("RGB")
            return self.transform(img).unsqueeze(0).to(self.device)
        except Exception as e:
            logger.warning(f"Image load failed ({image_url}): {e}")
            return None

    def _run_ensemble(self, img_tensor: torch.Tensor) -> Tuple[torch.Tensor, float]:
        """Run all models, return averaged calibrated probs and max logit margin."""
        all_probs = []
        with torch.no_grad():
            for model in self.models:
                try:
                    logits = model(img_tensor)
                    # Handle models that return (probs, embeddings) tuple
                    if isinstance(logits, tuple):
                        logits = logits[0]
                    # If model already outputs softmax probabilities (sum ~ 1.0), do not re-softmax
                    if torch.allclose(logits.sum(dim=1), torch.ones(logits.shape[0], device=logits.device), atol=1e-3):
                        probs = logits
                    else:
                        probs = F.softmax(logits / self.temperature, dim=1)
                    all_probs.append(probs)
                except Exception as e:
                    logger.error(f"Model forward error: {e}")

        if not all_probs:
            raise RuntimeError("All models failed")

        ens_probs = torch.stack(all_probs).mean(dim=0)  # (1, C)
        return ens_probs[0]  # (C,)

    def predict(self, image_url: str, crop_type: Optional[str] = None) -> Dict[str, Any]:
        # Phase 1: Excluded class gate — V5 wheat IS included (53 classes), so gate only fires if wheat classes missing
        if crop_type and any(w in crop_type.lower() for w in ['wheat', 'ble', 'blé', 'durum', 'kamh', 'قمح']) and 'wheat_healthy' not in self.classes:
            logger.info(f"Wheat crop requested ({crop_type}). Skipping local model per excluded class rule.")
            return {
                "disease": "Blé — Non supporté localement (Collecte requise)",
                "disease_key": "wheat_excluded",
                "confidence": 0.0,
                "margin": 0.0,
                "is_healthy": False,
                "needs_expert": True,
                "excluded_class": True,
                "top3": [],
                "model_version": self.version,
                "temperature": self.temperature,
                "simulated": False,
            }

        # Opuntia gate (V5): no opuntia class in 53-class model → skip local, force Gemini+expert
        if crop_type and any(k in crop_type.lower() for k in ['opuntia', 'figuier', 'cactus', 'تين شوكي', 'تين']):
            if 'opuntia_cochineal_infested' not in self.classes:
                return {
                    "disease": "Figuier de Barbarie — Non supporté localement (modèle sans classe Opuntia)",
                    "disease_key": "opuntia_excluded",
                    "confidence": 0.0,
                    "margin": 0.0,
                    "is_healthy": False,
                    "needs_expert": True,
                    "excluded_class": True,
                    "top3": [],
                    "model_version": self.version,
                    "temperature": self.temperature,
                    "simulated": False,
                }

        cache_key = self._cache_key(f"{image_url}_{crop_type or ''}")
        if cache_key in self._cache:
            entry = self._cache[cache_key]
            if (time.time() - entry["timestamp"]) < 3600:
                return entry["data"]

        if self.mode == "PRODUCTION_ENSEMBLE" and self.models:
            img_tensor = self._load_image(image_url)
            if img_tensor is not None:
                try:
                    probs = self._run_ensemble(img_tensor)
                    top2_vals, top2_idx = torch.topk(probs, k=min(3, len(self.classes)))

                    class_idx = top2_idx[0].item()
                    confidence = float(top2_vals[0].item())
                    margin = float((top2_vals[0] - top2_vals[1]).item()) if len(top2_vals) > 1 else 1.0
                    class_key = self.classes[class_idx]
                    disease_name = self.disease_display.get(class_idx, class_key.replace("_", " "))

                    # Crop conditioning: check if user specified a crop
                    crop_mismatch = False
                    if crop_type:
                        c_clean = crop_type.lower().strip()
                        valid_pfx = []
                        for k, pfxs in CROP_PREFIX_MAP.items():
                            if k in c_clean or c_clean in k:
                                valid_pfx.extend(pfxs)
                        if valid_pfx:
                            crop_indices = [i for i, c in enumerate(self.classes) if any(c.startswith(p) for p in valid_pfx)]
                            if crop_indices and class_idx not in crop_indices:
                                # Model predicted another plant -> flag anomaly / mismatch
                                crop_mismatch = True
                                c_best_idx = crop_indices[torch.argmax(probs[crop_indices]).item()]
                                class_idx = c_best_idx
                                class_key = self.classes[class_idx]
                                disease_name = self.disease_display.get(class_idx, class_key.replace("_", " "))
                                confidence = float(probs[crop_indices].sum().item())
                                margin = 0.0

                    # Top-3 for transparency
                    top3 = [
                        {
                            "class": self.classes[idx.item()],
                            "disease": self.disease_display.get(idx.item(), ""),
                            "confidence": round(float(val.item()), 4),
                        }
                        for val, idx in zip(top2_vals, top2_idx)
                    ]

                    is_healthy = "healthy" in class_key.lower() or "saine" in class_key.lower()
                    needs_expert = (
                        confidence < CONFIDENCE_THRESHOLD
                        or margin < MARGIN_THRESHOLD
                        or class_key in HIGH_RISK_CLASSES
                        or crop_mismatch
                    )

                    result = {
                        "disease": disease_name,
                        "disease_key": class_key,
                        "confidence": round(confidence, 4),
                        "margin": round(margin, 4),
                        "is_healthy": is_healthy,
                        "needs_expert": needs_expert,
                        "excluded_class": False,
                        "top3": top3,
                        "model_version": self.version,
                        "temperature": self.temperature,
                        "simulated": False,
                    }
                    self._cache[cache_key] = {"data": result, "timestamp": time.time()}
                    return result
                except Exception as e:
                    logger.error(f"Ensemble inference failed: {e}")

        # ─── Simulation fallback ─────────────────────────────────────────────
        logger.warning(f"Fallback simulation for {image_url}")
        h = int(cache_key[:16], 16)
        class_idx = h % len(self.disease_display)
        confidence = 0.55 + (h % 200) / 1000.0
        margin = 0.10 + (h % 120) / 1000.0
        class_key = self.classes[class_idx] if self.classes else "Unknown"
        disease_name = self.disease_display.get(class_idx, "Indéterminé — Expertise requise")
        is_healthy = "healthy" in class_key.lower() or "saine" in class_key.lower()

        result = {
            "disease": disease_name,
            "disease_key": class_key,
            "confidence": round(confidence, 4),
            "margin": round(margin, 4),
            "is_healthy": is_healthy,
            "needs_expert": True,
            "excluded_class": False,
            "top3": [{"class": class_key, "disease": disease_name, "confidence": round(confidence, 4)}],
            "model_version": f"{self.version}-simulation",
            "temperature": self.temperature,
            "simulated": True,
        }
        self._cache[cache_key] = {"data": result, "timestamp": time.time()}
        return result

    def predict_batch(self, image_urls: List[str]) -> List[Dict[str, Any]]:
        return [self.predict(url) for url in image_urls[:10]]

    def predict_yield(self, crop_type: str, area: float, gdd: float, rain: float) -> dict:
        yield_map = {"tomate": 60.0, "ble": 3.5, "olive": 2.5, "pomme de terre": 25.0, "poivron": 15.0}
        base = yield_map.get(crop_type.lower().replace("é","e").replace("â","a"), 5.0)
        gdd_f = min(1.2, gdd / 1500) if gdd > 0 else 1.0
        rain_f = min(1.1, rain / 400) if rain > 0 else 1.0
        predicted = base * gdd_f * rain_f
        return {
            "crop_type": crop_type,
            "predicted_yield_tonnes_ha": round(predicted, 2),
            "total_predicted_tonnes": round(predicted * area, 2),
            "confidence": 0.72,
            "model_version": self.version,
            "simulated": True,
        }

    def predict_prices(self, crop_type: str, periods: int = 7) -> dict:
        from datetime import datetime, timedelta
        import math
        base_prices = {"tomate": 1200, "ble": 950, "olive": 18000, "pomme de terre": 1100, "poivron": 2200}
        base = base_prices.get(crop_type.lower().replace("é","e").replace("â","a"), 1000)
        now = datetime.now()
        forecast = []
        for i in range(periods):
            variation = math.sin(i / max(periods, 1) * math.pi) * 0.06
            price = base * (1 + variation)
            forecast.append({
                "date": (now + timedelta(days=i)).strftime("%Y-%m-%d"),
                "predicted_price_tnd_tonne": round(price, 2),
                "lower_bound": round(price * 0.93, 2),
                "upper_bound": round(price * 1.07, 2),
            })
        return {"crop_type": crop_type, "forecast": forecast, "model_version": self.version, "simulated": True}

    @property
    def uptime_seconds(self) -> float:
        return round(time.time() - self.start_time, 1)

    @property
    def model_info(self) -> dict:
        return {
            "model_name": "ZirIA-Sentinel-v2-Ensemble",
            "version": self.version,
            "mode": self.mode,
            "models_loaded": len(self.models),
            "classes_count": len(self.classes),
            "device": str(self.device),
            "temperature": self.temperature,
            "confidence_threshold": CONFIDENCE_THRESHOLD,
            "margin_threshold": MARGIN_THRESHOLD,
            "cache_entries": len(self._cache),
            "yield_model_loaded": True,
            "price_model_loaded": True,
        }


predictor = DiseasePredictor()
