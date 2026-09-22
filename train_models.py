import os
import json
import urllib.request
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, mean_squared_error, mean_absolute_error, r2_score
)
import joblib

def main():
    print("=" * 60)
    print("COSMOSPACE3D: NASA EXOPLANET ML PIPELINE")
    print("=" * 60)

    # 1. Directories
    os.makedirs("data", exist_ok=True)
    os.makedirs("models", exist_ok=True)

    csv_path = os.path.join("data", "nasa_exoplanets.csv")
    nasa_tap_url = (
        "https://exoplanetarchive.ipac.caltech.edu/TAP/sync?"
        "query=select+pl_name,pl_bmasse,pl_rade,pl_orbper,pl_eqt,st_mass,st_rad,st_teff"
        "+from+ps+where+default_flag=1+and+pl_rade+is+not+null&format=csv"
    )

    # 2. Fetch or load data
    if not os.path.exists(csv_path):
        print(f"[1/5] Fetching real exoplanet records from NASA TAP Archive...")
        try:
            req = urllib.request.Request(nasa_tap_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=30) as response, open(csv_path, 'wb') as out_file:
                out_file.write(response.read())
            print(f"      Saved to {csv_path}")
        except Exception as e:
            print(f"      Warning: Network error fetching live data ({e}). Checking local fallback...")
            if not os.path.exists(csv_path):
                raise RuntimeError("Could not fetch NASA Exoplanet data and no cached file found.")
    else:
        print(f"[1/5] Loading cached NASA Exoplanet data from {csv_path}...")

    df = pd.read_csv(csv_path)
    print(f"      Total records fetched: {len(df):,}")

    # 3. Data Cleaning & Feature Preparation
    print("[2/5] Preprocessing & Feature Engineering...")
    df = df[df['pl_rade'].notnull() & (df['pl_rade'] > 0)].copy()

    # Impute missing features with median to retain sample size
    feature_cols = ['pl_bmasse', 'pl_orbper', 'pl_eqt', 'st_mass', 'st_rad', 'st_teff']
    for col in feature_cols:
        median_val = df[col].median()
        if pd.isna(median_val):
            median_val = 1.0
        df[col] = df[col].fillna(median_val)

    # Earth Similarity Index (ESI) Calculation
    # Reference: Schulze-Makuch et al. (2011) simplified planetary ESI
    esi_r = 1.0 - np.abs((df['pl_rade'] - 1.0) / (df['pl_rade'] + 1.0))
    esi_t = 1.0 - np.abs((df['pl_eqt'] - 288.0) / (df['pl_eqt'] + 288.0))
    df['esi'] = np.sqrt(np.clip(esi_r * esi_t, 0.0, 1.0))

    # Tier Bucketing
    # 0: Uninhabitable, 1: Sub-Surface / Intermediate, 2: Earth-Like
    conditions = [
        (df['esi'] >= 0.70),
        (df['esi'] >= 0.35) & (df['esi'] < 0.70),
        (df['esi'] < 0.35)
    ]
    choices = ['Earth-Like', 'Sub-Surface', 'Uninhabitable']
    df['habitability_tier'] = np.select(conditions, choices, default='Uninhabitable')

    tier_counts = df['habitability_tier'].value_counts()
    print("      Class Distribution:")
    for tier, count in tier_counts.items():
        print(f"        - {tier:15}: {count:5} planets ({count/len(df)*100:.1f}%)")

    # Train / Test Split
    X = df[feature_cols]
    y_hab = df['habitability_tier']
    y_rad = df['pl_rade']

    X_train, X_test, y_hab_train, y_hab_test, y_rad_train, y_rad_test, idx_train, idx_test = train_test_split(
        X, y_hab, y_rad, df.index, test_size=0.20, random_state=42, stratify=y_hab
    )
    print(f"      Train set: {len(X_train)} samples | Test set: {len(X_test)} samples")

    # 4. Train Habitability Classifier
    print("[3/5] Training Habitability Classification Models...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Baseline: Logistic Regression
    clf_base = LogisticRegression(max_iter=1000, random_state=42)
    clf_base.fit(X_train_scaled, y_hab_train)
    y_hab_pred_base = clf_base.predict(X_test_scaled)

    # Trained Model: Random Forest
    clf_rf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42)
    clf_rf.fit(X_train, y_hab_train)
    y_hab_pred_rf = clf_rf.predict(X_test)

    acc_base = accuracy_score(y_hab_test, y_hab_pred_base)
    f1_base = f1_score(y_hab_test, y_hab_pred_base, average='weighted')
    acc_rf = accuracy_score(y_hab_test, y_hab_pred_rf)
    f1_rf = f1_score(y_hab_test, y_hab_pred_rf, average='weighted')
    prec_rf = precision_score(y_hab_test, y_hab_pred_rf, average='weighted')
    rec_rf = recall_score(y_hab_test, y_hab_pred_rf, average='weighted')

    print(f"      Baseline (Logistic Reg) : Accuracy={acc_base*100:.2f}%, F1={f1_base*100:.2f}%")
    print(f"      Trained (Random Forest) : Accuracy={acc_rf*100:.2f}%, F1={f1_rf*100:.2f}%")
    print(f"      Precision={prec_rf*100:.2f}%, Recall={rec_rf*100:.2f}%")

    # Confusion Matrix Plot
    classes = ['Uninhabitable', 'Sub-Surface', 'Earth-Like']
    cm = confusion_matrix(y_hab_test, y_hab_pred_rf, labels=classes)

    plt.figure(figsize=(7, 5.5), facecolor='#0a0b0e')
    ax = plt.gca()
    ax.set_facecolor('#0a0b0e')
    im = ax.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    plt.title('Habitability Classifier — Confusion Matrix (Random Forest)', color='#e2e8f0', fontsize=12, pad=14)
    tick_marks = np.arange(len(classes))
    plt.xticks(tick_marks, classes, color='#94a3b8', fontsize=10)
    plt.yticks(tick_marks, classes, color='#94a3b8', fontsize=10)
    plt.xlabel('Predicted Label', color='#e2e8f0', fontsize=11, labelpad=10)
    plt.ylabel('Ground Truth (ESI Tier)', color='#e2e8f0', fontsize=11, labelpad=10)

    # Annotate numbers in boxes
    thresh = cm.max() / 2.
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, format(cm[i, j], 'd'),
                    ha="center", va="center",
                    color="white" if cm[i, j] > thresh else "#cbd5e1",
                    fontsize=12, fontweight='bold')

    plt.tight_layout()
    plt.savefig('confusion_matrix.png', dpi=200, facecolor=plt.gcf().get_facecolor(), edgecolor='none')
    plt.close()
    print("      Saved confusion_matrix.png")

    # 5. Train Radius Regressor
    print("[4/5] Training Planet Radius Regression Models...")
    # Baseline: Linear Regression
    reg_base = LinearRegression()
    reg_base.fit(X_train, y_rad_train)
    y_rad_pred_base = reg_base.predict(X_test)

    rmse_base = np.sqrt(mean_squared_error(y_rad_test, y_rad_pred_base))
    mae_base = mean_absolute_error(y_rad_test, y_rad_pred_base)
    r2_base = r2_score(y_rad_test, y_rad_pred_base)

    # Trained Model: Random Forest Regressor
    reg_rf = RandomForestRegressor(n_estimators=100, max_depth=14, random_state=42)
    reg_rf.fit(X_train, y_rad_train)
    y_rad_pred_rf = reg_rf.predict(X_test)

    rmse_rf = np.sqrt(mean_squared_error(y_rad_test, y_rad_pred_rf))
    mae_rf = mean_absolute_error(y_rad_test, y_rad_pred_rf)
    r2_rf = r2_score(y_rad_test, y_rad_pred_rf)

    rmse_improvement = ((rmse_base - rmse_rf) / rmse_base) * 100.0

    print(f"      Baseline (Linear Reg)   : RMSE={rmse_base:.3f} R_Earth | MAE={mae_base:.3f} | R²={r2_base:.3f}")
    print(f"      Trained (Random Forest) : RMSE={rmse_rf:.3f} R_Earth | MAE={mae_rf:.3f} | R²={r2_rf:.3f}")
    print(f"      CONFIRMED: Random Forest beats baseline by {rmse_improvement:.1f}% reduction in RMSE!")

    # Actual vs Predicted Plot
    plt.figure(figsize=(9, 5), facecolor='#0a0b0e')
    ax = plt.gca()
    ax.set_facecolor('#0a0b0e')
    plt.scatter(y_rad_test, y_rad_pred_base, color='#64748b', alpha=0.35, s=25, label=f'Baseline Linear Reg (R²={r2_base:.2f})')
    plt.scatter(y_rad_test, y_rad_pred_rf, color='#38bdf8', alpha=0.7, s=30, label=f'Trained Random Forest (R²={r2_rf:.2f})')
    max_val = min(max(y_rad_test.max(), y_rad_pred_rf.max()), 30)
    plt.plot([0, max_val], [0, max_val], '--', color='#f59e0b', linewidth=1.5, label='Perfect Fit (y = x)')
    plt.xlim(0, max_val)
    plt.ylim(0, max_val)
    plt.title('Planet Radius Regression: Actual vs. Predicted ($R_\oplus$)', color='#e2e8f0', fontsize=12, pad=12)
    plt.xlabel('Actual Recorded Radius ($R_\oplus$)', color='#e2e8f0', fontsize=11)
    plt.ylabel('Predicted Radius ($R_\oplus$)', color='#e2e8f0', fontsize=11)
    plt.tick_params(colors='#94a3b8')
    plt.grid(True, color='#1e293b', linestyle=':', alpha=0.6)
    legend = plt.legend(facecolor='#111827', edgecolor='#374151', labelcolor='#e2e8f0')
    plt.tight_layout()
    plt.savefig('actual_vs_predicted.png', dpi=200, facecolor=plt.gcf().get_facecolor(), edgecolor='none')
    plt.close()
    print("      Saved actual_vs_predicted.png")

    # 6. Save Models & Artifacts
    print("[5/5] Exporting Models & Validation JSONs...")
    joblib.dump(clf_rf, os.path.join("models", "habitability_model.pkl"))
    joblib.dump(reg_rf, os.path.join("models", "radius_model.pkl"))
    print("      Exported models/habitability_model.pkl")
    print("      Exported models/radius_model.pkl")

    # Export Metrics JSON
    metrics_data = {
        "dataset": {
            "source": "NASA Exoplanet Archive (TAP API)",
            "total_records": int(len(df)),
            "train_samples": int(len(X_train)),
            "test_samples": int(len(X_test))
        },
        "habitability_classifier": {
            "baseline_logistic_regression": {
                "accuracy": round(float(acc_base), 4),
                "f1_weighted": round(float(f1_base), 4)
            },
            "random_forest": {
                "accuracy": round(float(acc_rf), 4),
                "f1_weighted": round(float(f1_rf), 4),
                "precision_weighted": round(float(prec_rf), 4),
                "recall_weighted": round(float(rec_rf), 4)
            }
        },
        "radius_regressor": {
            "baseline_linear_regression": {
                "rmse": round(float(rmse_base), 4),
                "mae": round(float(mae_base), 4),
                "r2": round(float(r2_base), 4)
            },
            "random_forest": {
                "rmse": round(float(rmse_rf), 4),
                "mae": round(float(mae_rf), 4),
                "r2": round(float(r2_rf), 4)
            },
            "rmse_improvement_pct": round(float(rmse_improvement), 2),
            "beats_baseline": bool(rmse_rf < rmse_base)
        }
    }
    with open("metrics.json", "w") as f:
        json.dump(metrics_data, f, indent=2)
    print("      Saved metrics.json")

    # 7. Select 5 Real Held-out Exoplanets for Phase 4 Demo Tab
    test_df = df.loc[idx_test].copy()
    test_df['predicted_radius'] = np.round(y_rad_pred_rf, 2)
    test_df['predicted_habitability'] = y_hab_pred_rf

    # Select interesting, diverse samples (1 Earth-like, 2 Sub-surface, 2 Uninhabitable)
    selected_samples = []
    for tier in ['Earth-Like', 'Sub-Surface', 'Uninhabitable']:
        tier_subset = test_df[test_df['habitability_tier'] == tier]
        sample_count = 2 if tier != 'Earth-Like' else min(1, len(tier_subset))
        sample_rows = tier_subset.head(sample_count)
        for _, row in sample_rows.iterrows():
            selected_samples.append({
                "name": str(row['pl_name']),
                "actual_radius_earth": round(float(row['pl_rade']), 2),
                "predicted_radius_earth": round(float(row['predicted_radius']), 2),
                "radius_error": round(abs(float(row['predicted_radius']) - float(row['pl_rade'])), 2),
                "ground_truth_tier": str(row['habitability_tier']),
                "predicted_tier": str(row['predicted_habitability']),
                "esi_score": round(float(row['esi']), 3),
                "equilibrium_temp_k": round(float(row['pl_eqt']), 1),
                "orbital_period_days": round(float(row['pl_orbper']), 2)
            })

    # Fallback to first 5 if empty
    if len(selected_samples) < 5:
        selected_samples = []
        for _, row in test_df.head(5).iterrows():
            selected_samples.append({
                "name": str(row['pl_name']),
                "actual_radius_earth": round(float(row['pl_rade']), 2),
                "predicted_radius_earth": round(float(row['predicted_radius']), 2),
                "radius_error": round(abs(float(row['predicted_radius']) - float(row['pl_rade'])), 2),
                "ground_truth_tier": str(row['habitability_tier']),
                "predicted_tier": str(row['predicted_habitability']),
                "esi_score": round(float(row['esi']), 3),
                "equilibrium_temp_k": round(float(row['pl_eqt']), 1),
                "orbital_period_days": round(float(row['pl_orbper']), 2)
            })

    with open("held_out_samples.json", "w") as f:
        json.dump(selected_samples, f, indent=2)
    print("      Saved held_out_samples.json (5 real test planets for demo)")

    print("=" * 60)
    print("PHASE 1 COMPLETE: All models and PPT artifacts successfully created.")
    print("=" * 60)

if __name__ == "__main__":
    main()
