# CosmoSpace3D — Interactive Solar System & Planetary ML Telemetry Platform

**Mumbai University BTech IT — Sem 5 Mini Project**  
*CosmoSpace3D* is an interactive 3D Solar System exploration and planetary machine learning telemetry platform designed with a high-contrast **NASA JPL / Linear telemetry aesthetic**. It combines real-time WebGL/Three.js astronomical visualization with trained Random Forest models running live inference on NASA Exoplanet Archive parameters.

---

## 🚀 Quickstart (2-Command Launch)

Both servers run independently with zero database setup hurdles (no MongoDB daemon required).

### Terminal 1: Launch Backend API
```bash
cd backend
python3 -m uvicorn main:app --reload --port 8000
```
*Health Check:* [http://localhost:8000/api/health](http://localhost:8000/api/health)  
*API Docs (Swagger):* [http://localhost:8000/docs](http://localhost:8000/docs)

### Terminal 2: Launch Frontend Telemetry HUD
```bash
cd frontend
npm run dev
```
*Web App URL:* **[http://localhost:5173](http://localhost:5173)**

---

## 🛰️ Architecture Overview

```
CosmoSpace3D/
├── data/
│   └── nasa_exoplanets.csv          # NASA Exoplanet Archive TAP dataset (4,749 records)
├── models/
│   ├── habitability_model.pkl       # Random Forest Classifier (Earth-Like / Sub-Surface / Uninhabitable)
│   └── radius_model.pkl             # Random Forest Regressor (Planet Radius pl_rade)
├── metrics.json                     # Complete model evaluation vs baselines
├── confusion_matrix.png             # Habitability classifier confusion matrix plot
├── actual_vs_predicted.png          # Radius regression actual vs. predicted plot
├── held_out_samples.json            # 5 real held-out NASA exoplanet test samples
├── train_models.py                  # Phase 1 ML training pipeline script
├── backend/
│   ├── main.py                      # FastAPI telemetry backend with CORS & inference routes
│   └── celestial_bodies.json        # Seed data (Sun, 8 planets, Moon) with 3D & ML telemetry
└── frontend/                        # React 19 + Vite + Tailwind CSS + Three.js / R3F
    ├── src/
    │   ├── components/
    │   │   ├── SolarSystemScene.jsx   # Three.js 3D Canvas, procedural PBR, orbits, smooth camera lerp
    │   │   ├── InspectorPanel.jsx     # NASA JPL Telemetry drawer, live ML prediction & parameter sliders
    │   │   ├── TelemetryHeader.jsx    # Top mission HUD, Julian epoch, quick jump pills, view toggle
    │   │   ├── SimulationControls.jsx # Speed multiplier (0.5x-5x), pause/play, orbit line toggle
    │   │   └── ModelValidationView.jsx# Phase 4 held-out NASA test set verification tab
    │   ├── services/api.js            # Frontend REST client
    │   ├── index.css                  # Monospace tabular telemetry styling & dark space theme
    │   └── App.jsx                    # Root layout and state coordinator
```

---

## 📊 Phase 1 Model Benchmark Artifacts

The following evaluation artifacts were generated from the real NASA Exoplanet Archive dataset:

1. **`metrics.json`**:
   - **Habitability Classifier**:
     - Baseline (Logistic Regression): Accuracy = **85.79%**, F1 = **84.48%**
     - Trained (Random Forest): Accuracy = **92.32%**, F1 = **92.24%**, Precision = **92.37%**, Recall = **92.32%**
   - **Planet Radius Regressor**:
     - Baseline (Linear Regression): RMSE = **4.241 $R_\oplus$**, MAE = **2.820**, $R^2$ = **0.364**
     - Trained (Random Forest): RMSE = **2.970 $R_\oplus$**, MAE = **1.253**, $R^2$ = **0.688**
     - **Confirmed:** Trained model beats baseline by **29.97% lower RMSE** and nearly doubles $R^2$.
2. **`confusion_matrix.png`**: Multi-class confusion matrix on the 950 test set planets.
3. **`actual_vs_predicted.png`**: Scatter plot contrasting baseline linear predictions vs Random Forest fit against ground truth $y = x$.
4. **`held_out_samples.json`**: 5 diverse test planets (`Kepler-1649 c`, `Kepler-1127 b`, `Kepler-1168 b`, `HAT-P-37 b`, `TOI-2373 b`).

---

## 🎓 5-Bullet Viva Defense Cheat-Sheet (For Professors & Viva)

1. **Dataset Size & Source:**
   - Sourced directly from the official **NASA Exoplanet Archive (Caltech/IPAC TAP service)** querying 4,749 confirmed planetary records with 8 physical features (`pl_bmasse`, `pl_rade`, `pl_orbper`, `pl_eqt`, `st_mass`, `st_rad`, `st_teff`).
2. **Why ESI (Earth Similarity Index) Was Chosen for Labeling:**
   - Uses the peer-reviewed planetary formula (Schulze-Makuch et al., 2011) combining planetary radius ($ESI_r$) and thermal equilibrium ($ESI_t$ around 288 K):
     $$ESI = \sqrt{\max\left(0, \left(1 - \left|\frac{R - 1}{R + 1}\right|\right) \times \left(1 - \left|\frac{T_{eq} - 288}{T_{eq} + 288}\right|\right)\right)}$$
   - Categorized into three astrophysically grounded tiers: **Earth-Like** ($ESI \ge 0.70$), **Sub-Surface/Intermediate** ($0.35 \le ESI < 0.70$), and **Uninhabitable** ($ESI < 0.35$).
3. **Baseline Comparison & Exact Metrics:**
   - **Classification:** Random Forest achieves **92.32% accuracy** (+6.53% over Logistic Regression baseline).
   - **Regression:** Random Forest achieves an **RMSE of 2.970 $R_\oplus$** (**29.97% error reduction** over Linear Regression) and an $R^2$ of **0.688** vs 0.364.
4. **Interactive Parameter Simulation:**
   - The HUD includes an interactive parameter simulator where examiners can tweak mass, equilibrium temperature, and orbital period sliders to witness real-time model inference and hazard assessment updates.
5. **Zero-Friction Single-Backend Architecture:**
   - Instead of heavyweight distributed microservices or an external database daemon, the system utilizes a fast, lightweight FastAPI service with in-memory pickled models (`joblib`), ensuring sub-2ms inference latency and zero deployment friction.
