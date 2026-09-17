"""
ZirIA Sentinel — IA Microservice (FastAPI)
Endpoints : /health, /model/info, /predict, /predict/batch, /predict/yield, /predict/price
"""

import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uvicorn
import logging
from predictor import predictor

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="ZirIA IA Microservice",
    description="Moteur d'IA ZirIA : Maladies, Rendements et Prix.",
    version="1.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("uvicorn")

# ── Schemas ───────────────────────────────────────────────────────────────────
class PredictionRequest(BaseModel):
    image_url: str = Field(..., description="URL publique HTTPS d'une image")
    crop_type: Optional[str] = Field(None, description="Culture indiquée par l'agriculteur")

class PredictionResponse(BaseModel):
    disease: str
    disease_key: Optional[str] = None
    confidence: float
    margin: float
    needs_expert: bool
    excluded_class: Optional[bool] = False
    model_version: str
    top3: Optional[List[Dict[str, Any]]] = None
    embedding: Optional[List[float]] = None
    embedding_dim: Optional[int] = None

class BatchPredictionRequest(BaseModel):
    image_urls: List[str]

class YieldRequest(BaseModel):
    crop_type: str
    parcel_area_ha: float
    governorate: str
    gdd_accumulated: float
    rainfall_mm: float
    fertilizer_kg_ha: Optional[float] = 0
    disease_pressure_score: Optional[float] = 0

class PriceRequest(BaseModel):
    crop_type: str
    periods: Optional[int] = 7

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "service": "ZirIA IA Microservice",
        "status": "online",
        "version": "2.0.0",
        "endpoints": ["/health", "/model/info", "/predict", "/predict/batch", "/predict/yield", "/predict/price"]
    }

@app.get("/health")
async def health():
    """Health check conforme aux attentes du Backend NestJS."""
    info = predictor.model_info
    return {
        "status": "healthy",
        "uptime_s": predictor.uptime_seconds,
        "yield_model_loaded": info["yield_model_loaded"],
        "price_model_loaded": info["price_model_loaded"],
        "version": info["version"],
        "device": info["device"],
        "mode": info["mode"]
    }

@app.get("/model/info")
async def model_info():
    return predictor.model_info

@app.post("/predict", response_model=PredictionResponse)
async def predict_disease(request: PredictionRequest):
    res = predictor.predict(request.image_url, request.crop_type)
    return PredictionResponse(
        disease=res["disease"],
        disease_key=res.get("disease_key"),
        confidence=round(res["confidence"], 4),
        margin=round(res["margin"], 4),
        needs_expert=res["needs_expert"],
        excluded_class=res.get("excluded_class", False),
        model_version=res["model_version"],
        top3=res.get("top3"),
        embedding=res.get("embedding"),
        embedding_dim=res.get("embedding_dim", 1280)
    )

@app.post("/predict/batch", response_model=List[PredictionResponse])
async def predict_disease_batch(request: BatchPredictionRequest):
    batch_res = predictor.predict_batch(request.image_urls)
    return [
        PredictionResponse(
            disease=r["disease"],
            confidence=round(r["confidence"], 4),
            margin=round(r["margin"], 4),
            needs_expert=r["needs_expert"],
            model_version=r["model_version"],
            embedding=r.get("embedding"),
            embedding_dim=r.get("embedding_dim", 1280)
        )
        for r in batch_res
    ]

@app.post("/predict/yield")
async def predict_yield(request: YieldRequest):
    """Prédit le rendement d'une parcelle."""
    return predictor.predict_yield(
        request.crop_type, 
        request.parcel_area_ha, 
        request.gdd_accumulated, 
        request.rainfall_mm
    )

@app.post("/predict/price")
async def predict_price(request: PriceRequest):
    """Prédit l'évolution des prix du marché."""
    return predictor.predict_prices(request.crop_type, request.periods)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
