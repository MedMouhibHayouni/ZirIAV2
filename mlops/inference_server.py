"""
ZirIA Sentinel V2.0 — MLOps Inference Microservice
FastAPI server exposing predictive AI endpoints.

Endpoints:
  GET  /health                → Heartbeat for NestJS to poll
  POST /predict/yield         → XGBoost crop-yield forecast
  POST /predict/price         → Prophet market-price forecast

Models are loaded ONCE at startup from ./models/*.pkl to minimise latency.
If model files are absent the service starts in "simulated" mode and returns
plausible synthetic predictions (useful for staging/demo deployments).
"""

from __future__ import annotations

import os
import pickle
import logging
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ─── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("ziria.mlops")

# ─── App ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="ZirIA MLOps Inference Engine",
    description="Predictive AI micro-service for crop-yield (XGBoost) and price forecasting (Prophet)",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Restrict to NestJS host in production via env var
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ─── Model Registry ─────────────────────────────────────────────────────────
MODELS_DIR = Path(os.getenv("MODELS_DIR", "./models"))

def _load_pickle(filename: str) -> Any | None:
    path = MODELS_DIR / filename
    if not path.exists():
        log.warning("Model file not found: %s — running in simulated mode", path)
        return None
    with open(path, "rb") as f:
        model = pickle.load(f)
    log.info("Loaded model: %s", path)
    return model

# Load at startup (not per-request)
YIELD_MODEL  = _load_pickle("xgboost_yield.pkl")
PRICE_MODEL  = _load_pickle("prophet_price.pkl")

# ─── Schemas ────────────────────────────────────────────────────────────────

class YieldRequest(BaseModel):
    crop_type: str = Field(..., example="BLE_DUR")
    parcel_area_ha: float = Field(..., gt=0, example=4.5)
    governorate: str = Field(..., example="Kasserine")
    gdd_accumulated: float = Field(..., ge=0, example=1240.0)
    rainfall_mm: float = Field(..., ge=0, example=310.0)
    fertilizer_kg_ha: float = Field(0.0, ge=0, example=120.0)
    disease_pressure_score: float = Field(0.0, ge=0.0, le=1.0, example=0.15)

class YieldResponse(BaseModel):
    crop_type: str
    predicted_yield_tonnes_ha: float
    total_predicted_tonnes: float
    confidence: float
    model_version: str
    simulated: bool

class PriceRequest(BaseModel):
    crop_type: str = Field(..., example="BLE_DUR")
    target_date: date = Field(default_factory=lambda: date.today() + timedelta(days=30))
    periods: int = Field(30, ge=1, le=365)

class PricePeriod(BaseModel):
    date: str
    predicted_price_tnd_tonne: float
    lower_bound: float
    upper_bound: float

class PriceResponse(BaseModel):
    crop_type: str
    forecast: list[PricePeriod]
    model_version: str
    simulated: bool

class HealthResponse(BaseModel):
    status: str
    yield_model_loaded: bool
    price_model_loaded: bool
    version: str

# ─── Baseline data for simulated mode ───────────────────────────────────────

CROP_BASE_YIELD: dict[str, float] = {
    "BLE_DUR":   3.2,
    "ORGE":      2.8,
    "TOMATE":   55.0,
    "OLIVE":     4.5,
    "PIMENT":   18.0,
    "DEFAULT":   3.0,
}

CROP_BASE_PRICE: dict[str, float] = {
    "BLE_DUR":   780.0,
    "ORGE":      620.0,
    "TOMATE":   320.0,
    "OLIVE":   3800.0,
    "PIMENT":   580.0,
    "DEFAULT":  500.0,
}

# ─── Endpoints ──────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["System"])
def health() -> HealthResponse:
    """Heartbeat endpoint — polled every 30s by NestJS HealthController."""
    return HealthResponse(
        status="ok",
        yield_model_loaded=YIELD_MODEL is not None,
        price_model_loaded=PRICE_MODEL is not None,
        version="2.0.0",
    )


@app.post("/predict/yield", response_model=YieldResponse, tags=["Predictions"])
def predict_yield(req: YieldRequest) -> YieldResponse:
    """
    Crop-yield prediction using XGBoost.
    Falls back to a calibrated heuristic when the model file is absent.
    """
    simulated = YIELD_MODEL is None

    if not simulated:
        try:
            features = np.array([[
                req.gdd_accumulated,
                req.rainfall_mm,
                req.fertilizer_kg_ha,
                req.disease_pressure_score,
                req.parcel_area_ha,
            ]])
            yield_per_ha: float = float(YIELD_MODEL.predict(features)[0])
            confidence = 0.87
        except Exception as exc:
            log.error("XGBoost inference failed: %s", exc)
            raise HTTPException(status_code=500, detail=f"Model inference error: {exc}") from exc
    else:
        # Heuristic simulation — deterministic given same inputs
        base = CROP_BASE_YIELD.get(req.crop_type.upper(), CROP_BASE_YIELD["DEFAULT"])
        gdd_factor  = min(req.gdd_accumulated / 1400, 1.2)
        rain_factor = min(req.rainfall_mm / 400, 1.1)
        disease_penalty = 1.0 - (req.disease_pressure_score * 0.35)
        yield_per_ha = round(base * gdd_factor * rain_factor * disease_penalty, 2)
        confidence = 0.73   # lower confidence for simulated output

    return YieldResponse(
        crop_type=req.crop_type,
        predicted_yield_tonnes_ha=round(yield_per_ha, 3),
        total_predicted_tonnes=round(yield_per_ha * req.parcel_area_ha, 3),
        confidence=confidence,
        model_version="xgb-v2.0" if not simulated else "heuristic-v2.0",
        simulated=simulated,
    )


@app.post("/predict/price", response_model=PriceResponse, tags=["Predictions"])
def predict_price(req: PriceRequest) -> PriceResponse:
    """
    Market-price forecast using Prophet.
    Falls back to a seasonal simulation when the model file is absent.
    """
    simulated = PRICE_MODEL is None
    forecast_list: list[PricePeriod] = []

    if not simulated:
        try:
            from pandas import DataFrame  # lazy import — only needed with real model
            future = PRICE_MODEL.make_future_dataframe(periods=req.periods)
            forecast = PRICE_MODEL.predict(future).tail(req.periods)
            for _, row in forecast.iterrows():
                forecast_list.append(PricePeriod(
                    date=str(row["ds"].date()),
                    predicted_price_tnd_tonne=round(float(row["yhat"]), 2),
                    lower_bound=round(float(row["yhat_lower"]), 2),
                    upper_bound=round(float(row["yhat_upper"]), 2),
                ))
        except Exception as exc:
            log.error("Prophet inference failed: %s", exc)
            raise HTTPException(status_code=500, detail=f"Model inference error: {exc}") from exc
    else:
        base_price = CROP_BASE_PRICE.get(req.crop_type.upper(), CROP_BASE_PRICE["DEFAULT"])
        for i in range(req.periods):
            d = date.today() + timedelta(days=i)
            # Simulate slight seasonal variation (sine wave)
            import math
            variation = math.sin(i / req.periods * math.pi) * 0.08
            predicted = round(base_price * (1 + variation), 2)
            forecast_list.append(PricePeriod(
                date=str(d),
                predicted_price_tnd_tonne=predicted,
                lower_bound=round(predicted * 0.92, 2),
                upper_bound=round(predicted * 1.08, 2),
            ))

    return PriceResponse(
        crop_type=req.crop_type,
        forecast=forecast_list,
        model_version="prophet-v2.0" if not simulated else "heuristic-v2.0",
        simulated=simulated,
    )
