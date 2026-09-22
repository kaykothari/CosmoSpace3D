import os
import json
import numpy as np
import pandas as pd
import joblib
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Base Directory paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)

MODELS_DIR = os.path.join(ROOT_DIR, "models")
HABITABILITY_MODEL_PATH = os.path.join(MODELS_DIR, "habitability_model.pkl")
RADIUS_MODEL_PATH = os.path.join(MODELS_DIR, "radius_model.pkl")
CELESTIAL_BODIES_PATH = os.path.join(BASE_DIR, "celestial_bodies.json")
HELD_OUT_PATH = os.path.join(ROOT_DIR, "held_out_samples.json")
METRICS_PATH = os.path.join(ROOT_DIR, "metrics.json")

app = FastAPI(
    title="CosmoSpace3D Telemetry API",
    description="Planetary ML Telemetry Engine for CosmoSpace3D",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Models into Memory
habitability_model = None
radius_model = None

try:
    if os.path.exists(HABITABILITY_MODEL_PATH):
        habitability_model = joblib.load(HABITABILITY_MODEL_PATH)
        print(f"[OK] Habitability model loaded from {HABITABILITY_MODEL_PATH}")
    else:
        print(f"[WARN] Habitability model not found at {HABITABILITY_MODEL_PATH}")

    if os.path.exists(RADIUS_MODEL_PATH):
        radius_model = joblib.load(RADIUS_MODEL_PATH)
        print(f"[OK] Radius model loaded from {RADIUS_MODEL_PATH}")
    else:
        print(f"[WARN] Radius model not found at {RADIUS_MODEL_PATH}")
except Exception as e:
    print(f"[ERROR] Failed loading models: {e}")

# Request Schema for Telemetry Prediction
class PredictRequest(BaseModel):
    pl_bmasse: float = Field(..., description="Planetary mass in Earth masses")
    pl_orbper: float = Field(..., description="Orbital period in Earth days")
    pl_eqt: float = Field(..., description="Equilibrium temperature in Kelvin")
    st_mass: float = Field(1.0, description="Host stellar mass in Solar masses")
    st_rad: float = Field(1.0, description="Host stellar radius in Solar radii")
    st_teff: float = Field(5778.0, description="Host stellar effective temperature in Kelvin")
    pl_rade: Optional[float] = Field(None, description="Actual recorded planetary radius (if known)")

def compute_esi(radius: float, eq_temp: float) -> float:
    """Computes simplified Earth Similarity Index (Schulze-Makuch et al.)"""
    r = max(0.01, float(radius))
    t = max(1.0, float(eq_temp))
    esi_r = 1.0 - abs((r - 1.0) / (r + 1.0))
    esi_t = 1.0 - abs((t - 288.0) / (t + 288.0))
    val = float(np.sqrt(np.clip(esi_r * esi_t, 0.0, 1.0)))
    return round(val, 3)

def generate_hazard_notes(tier: str, esi: float, temp: float, radius: float, mass: float) -> str:
    """Generates NASA JPL-style planetary hazard & habitability telemetry commentary."""
    notes = []
    if temp < 180:
        notes.append("Cryogenic deep freeze; surface volatiles exist as cryogenic clathrates or sub-surface oceans only.")
    elif temp > 350:
        notes.append("Severe thermal irradiation; catastrophic runaway water loss and atmospheric boil-off.")
    else:
        notes.append("Thermal equilibrium supports potential circumstellar liquid surface water.")

    if radius > 2.0 or mass > 10.0:
        notes.append("Heavy volatile envelope; non-rocky gas mantle creates extreme hydrostatic pressures.")
    elif radius < 0.5:
        notes.append("Sub-Earth mass; vulnerable to stellar wind stripping due to minimal gravitational retention.")
    else:
        notes.append("Terrestrial rocky lithosphere regime.")

    if tier == "Earth-Like":
        notes.append("Goldilocks orbit telemetry confirmed with high atmospheric stability index.")
    elif tier == "Sub-Surface":
        notes.append("Intermediate astrobiological candidate; sub-surface geothermal or ocean habitability plausible.")
    else:
        notes.append("Inimical environment; lethal ionizing stellar flux and supercritical equilibrium.")

    return " ".join(notes)

@app.get("/api/health")
def health_check():
    return {
        "status": "nominal",
        "service": "CosmoSpace3D Telemetry API",
        "habitability_model_loaded": habitability_model is not None,
        "radius_model_loaded": radius_model is not None
    }

@app.get("/api/celestial-bodies")
def get_celestial_bodies():
    if not os.path.exists(CELESTIAL_BODIES_PATH):
        raise HTTPException(status_code=404, detail="Seed data celestial_bodies.json not found")
    with open(CELESTIAL_BODIES_PATH, "r") as f:
        data = json.load(f)
    return data

@app.get("/api/celestial-bodies/{name}")
def get_celestial_body(name: str):
    if not os.path.exists(CELESTIAL_BODIES_PATH):
        raise HTTPException(status_code=404, detail="Seed data celestial_bodies.json not found")
    with open(CELESTIAL_BODIES_PATH, "r") as f:
        bodies = json.load(f)
    
    query = name.strip().lower()
    for body in bodies:
        if body["id"].lower() == query or body["name"].lower() == query:
            return body
    raise HTTPException(status_code=404, detail=f"Celestial body '{name}' not found")

@app.post("/api/predict")
def predict_telemetry(payload: PredictRequest):
    if habitability_model is None or radius_model is None:
        raise HTTPException(status_code=503, detail="ML inference models not initialized")

    # Feature vector matching Phase 1: ['pl_bmasse', 'pl_orbper', 'pl_eqt', 'st_mass', 'st_rad', 'st_teff']
    feature_df = pd.DataFrame([{
        'pl_bmasse': float(payload.pl_bmasse),
        'pl_orbper': float(payload.pl_orbper),
        'pl_eqt': float(payload.pl_eqt),
        'st_mass': float(payload.st_mass),
        'st_rad': float(payload.st_rad),
        'st_teff': float(payload.st_teff)
    }])

    # 1. Predict Planet Radius
    pred_radius_val = float(radius_model.predict(feature_df)[0])
    pred_radius = round(max(0.05, pred_radius_val), 2)

    # 2. Predict Habitability Tier & Probabilities
    tier = str(habitability_model.predict(feature_df)[0])
    
    probabilities = {}
    confidence = 0.85
    if hasattr(habitability_model, "predict_proba"):
        probs = habitability_model.predict_proba(feature_df)[0]
        classes = list(habitability_model.classes_)
        for cls_name, prob in zip(classes, probs):
            probabilities[str(cls_name)] = round(float(prob), 4)
        confidence = round(float(max(probs)), 3)

    # 3. Compute ESI Score
    # Use actual radius if provided, otherwise the model's predicted radius
    radius_for_esi = payload.pl_rade if (payload.pl_rade is not None and payload.pl_rade > 0) else pred_radius
    esi_score = compute_esi(radius_for_esi, payload.pl_eqt)

    # 4. Generate Hazard Assessment Notes
    hazard_text = generate_hazard_notes(
        tier=tier,
        esi=esi_score,
        temp=payload.pl_eqt,
        radius=pred_radius,
        mass=payload.pl_bmasse
    )

    actual_radius = payload.pl_rade if payload.pl_rade is not None else None
    radius_error = round(abs(pred_radius - actual_radius), 2) if actual_radius is not None else None

    return {
        "habitability_tier": tier,
        "esi_score": esi_score,
        "predicted_radius": pred_radius,
        "actual_radius": actual_radius,
        "radius_error": radius_error,
        "confidence": confidence,
        "probabilities": probabilities,
        "hazard_assessment": hazard_text
    }

@app.get("/api/held-out")
def get_held_out():
    if not os.path.exists(HELD_OUT_PATH):
        raise HTTPException(status_code=404, detail="held_out_samples.json not found")
    with open(HELD_OUT_PATH, "r") as f:
        return json.load(f)

@app.get("/api/metrics")
def get_metrics():
    if not os.path.exists(METRICS_PATH):
        raise HTTPException(status_code=404, detail="metrics.json not found")
    with open(METRICS_PATH, "r") as f:
        return json.load(f)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
