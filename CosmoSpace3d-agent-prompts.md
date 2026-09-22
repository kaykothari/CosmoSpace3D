# CosmoSpace3D — 90-Minute Agentic Build Plan

**Constraint driving this whole doc:** you have ~90 minutes in the agentic IDE, once. Model
work (Phase 1) must be 100% complete and correct — it's what gets graded most closely and
it's what you'll present via PPT. Everything else only needs to reach ~80% and look
presentable; it does NOT need to expose full model evaluation in the app itself, since
metrics/comparison charts will be shown separately in your slides, not live in the UI.

**Design & UX Directive (CRITICAL):**
The UI must look handcrafted, clean, and professional — NOT like an AI-generated template.
- AVOID dead giveaways: NO rainbow/purple-cyan gradient buttons, NO excessive frosted glassmorphism, NO floating background gradient blobs, NO generic cheesy emojis (🪐, 🚀, 🤖), NO "✨ AI-powered" marketing badges.
- ADOPT: Aerospace / NASA JPL / Linear telemetry aesthetic. Deep slate/charcoal background (`#0a0b0e`), crisp 1px borders (`rgba(255,255,255,0.08)`), monospace numbers with tabular figures for telemetry, solid dark tactile buttons with subtle hover highlights, clean high-contrast typography, and intuitive camera controls.

**Time budget (adjust as you go, but protect Phase 1 first):**
- Phase 1 (models): ~30–35 min — do not cut this short even if it eats into later phases
- Phase 2 (backend + seed data): ~15 min
- Phase 3 (3D scene + focus panel): ~25–30 min
- Phase 4 (held-out planet demo tab): ~10 min if time remains
- Leftover: README + PPT screenshots

---

## 0. Master Context (paste first)

```
PROJECT: CosmoSpace3D — Interactive Solar System & Planetary ML Telemetry Platform
CONTEXT: Mumbai University BTech IT Sem 5 mini project. I have ONE ~90-minute session with
you to build this. Model correctness is the top priority — it is evaluated via PPT and viva.
The web app is a live interactive telemetry demo.

STACK & RUNTIME RULES (Simplicity & Zero-Friction):
- Frontend: React + Vite + Three.js (@react-three/fiber, @react-three/drei) + Tailwind CSS.
- Backend: Lightweight single backend (Node/Express OR FastAPI). NO MongoDB daemon required
  (use local JSON seed data celestial_bodies.json).
- Python: Use global Python environment directly (no virtual env activation required).
- NO auth, no user accounts, no JWT.

DESIGN & UX DIRECTIVES (NO "AI-GENERATED" LOOK):
- Strictly avoid generic AI tropes: NO purple/cyan gradient buttons, NO glowing neon blobs,
  NO cheesy emojis, NO generic "✨ AI-powered" badges.
- Use a refined NASA JPL / Linear telemetry aesthetic: dark space background (#090a0f),
  crisp 1px subtle borders (#1f242e), monospace tabular figures for scientific telemetry,
  clean flat buttons with subtle hover feedback, and high readability.

TWO MODELS REQUIRED (Real NASA Exoplanet Archive target variables):
1. Habitability classifier — 3-class (Uninhabitable / Sub-Surface / Earth-Like)
   using standard ESI on NASA Exoplanet data. Compare Random Forest vs Logistic Regression
   baseline, reporting accuracy, precision, recall, F1, and confusion matrix.
2. Planet radius regressor — predicts real recorded planet radius (pl_rade) from mass,
   equilibrium temp, orbital period, stellar mass/radius/temp. Must be evaluated against
   Linear Regression baseline using RMSE, MAE, R², showing the trained model beating the baseline.

Work fast, prioritize finish over perfection, and flag any simplifications for the PPT.
```

---

## 1. Phase 1 — Models (protect this time, do not shortcut)

```
Build both models now, fast and correctly. Save all artifacts to disk:
metrics.json, confusion_matrix.png, actual_vs_predicted.png, and held_out_samples.json.

1. PULL NASA DATA:
   Query the NASA Exoplanet Archive TAP service directly via pandas.read_csv():
   "https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+pl_name,pl_bmasse,pl_rade,pl_orbper,pl_eqt,st_mass,st_rad,st_teff+from+ps+where+default_flag=1+and+pl_rade+is+not+null&format=csv"
   (Drop rows missing pl_rade. Impute other feature NaNs using column medians).

2. HABITABILITY MODEL:
   - Compute simplified Earth Similarity Index (ESI):
     esi_r = 1 - abs((pl_rade - 1.0) / (pl_rade + 1.0))
     esi_t = 1 - abs((pl_eqt - 288.0) / (pl_eqt + 288.0))
     esi = sqrt(clip(esi_r * esi_t, 0, 1))
   - Buckets: Earth-Like (ESI >= 0.70), Sub-Surface / Intermediate (0.35 <= ESI < 0.70), Uninhabitable (ESI < 0.35).
   - Features: pl_bmasse, pl_orbper, pl_eqt, st_mass, st_rad, st_teff.
   - Train/test split (80/20, random_state=42).
   - Train Logistic Regression (baseline) vs Random Forest Classifier.
   - Save confusion matrix to confusion_matrix.png and metrics to metrics.json.
   - Export model: models/habitability_model.pkl

3. RADIUS REGRESSION MODEL:
   - Target: pl_rade (Earth radii).
   - Features: pl_bmasse, pl_eqt, pl_orbper, st_mass, st_rad, st_teff.
   - Train Linear Regression as the formal baseline. Calculate RMSE, MAE, R² on test set.
   - Train Random Forest Regressor. Calculate same metrics on same test set.
   - Confirm trained model beats baseline.
   - Save actual vs predicted scatter plot to actual_vs_predicted.png.
   - Export model: models/radius_model.pkl
   - Export 5 diverse held-out test exoplanets to held_out_samples.json (pl_name, actual_radius, predicted_radius, habitability_tier, eq_temp).

4. Output plain-text summary of final metrics and confirm saved files.
```

---

## 2. Phase 2 — Backend + Seed Data (fast, zero-friction)

```
Build a minimal, clean backend without database setup hurdles:

1. SEED DATA (celestial_bodies.json):
   - Sun + 8 planets (Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune) + Moon.
   - Include visual params (color, size, orbitRadius, orbitSpeed, textureUrl) AND scientific
     features matching the ML model: mass (pl_bmasse), radius (pl_rade), temp (pl_eqt),
     period (pl_orbper), stellar host params (st_mass=1.0, st_rad=1.0, st_teff=5778).

2. REST API:
   - GET /api/celestial-bodies: returns all bodies.
   - GET /api/celestial-bodies/:name: returns single body telemetry.
   - POST /api/predict: loads models from Phase 1, accepts planetary features, returns:
     { habitability_tier, esi_score, predicted_radius, confidence_or_hazard }
   - GET /api/held-out: returns held_out_samples.json from Phase 1 for demo tab.

Keep it robust, handle CORS cleanly, and ensure it runs on a single command.
```

---

## 3. Phase 3 — 3D Scene + Focus Panel (telemetry aesthetic)

```
Build the 3D scene using @react-three/fiber and @react-three/drei with a NASA/Linear telemetry UI:

1. 3D SOLAR SYSTEM:
   - Stylized logarithmic scale: Sun (radius 2.5), Earth (0.7), Jupiter (1.5).
   - Orbit spacing: 4 to 32 units from Sun.
   - Orbit rings rendered as subtle faint circular lines.
   - Real textures with graceful PBR color fallbacks if textures fail to load.
   - OrbitControls with smooth damping; clicking a planet smoothly focuses the camera.

2. HUD & INSPECTOR PANEL (ANTI-AI AESTHETIC):
   - Clean dark telemetry theme (#0a0b0e background, #1e222d borders, #e2e8f0 text).
   - Top Bar: Minimal mission header "COSMOSPACE // TELEMETRY HUD", quick planet jump buttons.
   - Right Side Inspector (appears on planet click):
     * Body name, designation, type.
     * Real telemetry grid (Orbit Period, Distance, Mass, Radius, Equilibrium Temp) with tabular monospace fonts.
     * "Habitability Analysis" card: calls POST /api/predict, displays ESI score badge (Muted Emerald / Amber / Slate depending on tier), predicted tier, and key atmospheric notes.
     * Esc key or "✕" closes focus.
   - No cheesy emojis, no gradient buttons. Flat, tactile, professional controls.
```

---

## 4. Phase 4 — Held-Out Exoplanet Demo Tab (PPT proof)

```
Add a secondary tab/view: "Model Validation // Exoplanets".
- Fetches GET /api/held-out (the 5 real held-out planets saved in Phase 1).
- Displays them as clean comparison cards:
  * Planet Name (e.g. Kepler-452b, TRAPPIST-1e, TOI-700d).
  * Actual Recorded Radius vs. Model Predicted Radius side-by-side with Delta/Error.
  * Habitability Classification tier.
- A concise summary banner: "Validated on Held-Out NASA Exoplanet Archive test set. Model beats Linear Regression baseline by [X]% lower RMSE."
- This gives instant proof to professors that the model generalizes to unseen worlds.
```

---

## 5. Wrap-Up & Viva Prep

```
1. Generate README with exact 2-command start instructions:
   Terminal 1: Start backend
   Terminal 2: Start frontend
2. Confirm the 3 evaluation artifacts exist for the presentation:
   - metrics.json
   - confusion_matrix.png
   - actual_vs_predicted.png
3. Generate a 5-bullet "Viva Defense Cheat-Sheet" summarizing:
   - Dataset size & source (NASA Exoplanet Archive).
   - Why ESI was chosen for habitability labeling.
   - Exact baseline vs Random Forest comparison numbers.
   - Architecture summary (why direct telemetry was chosen over heavy microservices).
```
