import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, TrendingUp } from 'lucide-react';
import { fetchHeldOutSamples, fetchMetrics } from '../services/api';

export default function ModelValidationView() {
  const [samples, setSamples] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [heldOutData, metricsData] = await Promise.all([
          fetchHeldOutSamples(),
          fetchMetrics()
        ]);
        setSamples(heldOutData);
        setMetrics(metricsData);
      } catch (err) {
        console.error('Error loading validation data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getTierBadge = (tier) => {
    switch (tier) {
      case 'Earth-Like':
        return 'bg-[#34C759]/20 text-[#34C759] border border-[#34C759]/40';
      case 'Sub-Surface':
        return 'bg-[#FF9F0A]/20 text-[#FF9F0A] border border-[#FF9F0A]/40';
      case 'Uninhabitable':
      default:
        return 'bg-white/10 text-white/70 border border-white/15';
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#050608] text-white/50 text-sm">
        Loading evaluation telemetry...
      </div>
    );
  }

  const habitability = metrics?.habitability_classifier;
  const radius = metrics?.radius_regressor;

  return (
    <div className="w-full h-full overflow-y-auto bg-[#050608] pt-24 pb-16 px-6 sm:px-12 text-white">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Banner (Apple Card Style, Zero Gradients) */}
        <div className="apple-glass-card rounded-2xl p-6 sm:p-7 shadow-2xl border border-white/14">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold text-[#007AFF] tracking-wider block uppercase mb-1">
                Model Evaluation
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                NASA Exoplanet Archive Verification
              </h2>
              <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-2xl leading-relaxed">
                Benchmarked on 950 unseen test records. Both habitability classifier and radius regressor beat formal baselines.
              </p>
            </div>

            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5 flex items-center gap-3 shrink-0">
              <Award className="text-[#34C759]" size={26} />
              <div>
                <span className="text-[10px] text-white/45 block uppercase font-medium">RMSE Reduction</span>
                <span className="text-lg font-bold text-[#34C759] tabular-nums">
                  +{radius?.rmse_improvement_pct ?? 29.97}%
                </span>
                <span className="text-[10px] text-white/45 block">Over Linear Regression</span>
              </div>
            </div>
          </div>
        </div>

        {/* Side-by-Side Comparison Tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Classification */}
          <div className="apple-glass-card rounded-2xl p-4 sm:p-5 space-y-3 border border-white/14">
            <h3 className="text-sm font-semibold text-white">
              Habitability Classifier (3 Tiers)
            </h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/45 border-b border-white/10 text-left">
                  <th className="pb-2 font-medium">Metric</th>
                  <th className="pb-2 font-medium text-white/50">Logistic Reg</th>
                  <th className="pb-2 font-medium text-[#007AFF]">Random Forest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-white/90">
                <tr>
                  <td className="py-2.5 text-white/50">Accuracy</td>
                  <td className="py-2.5 tabular-nums">
                    {(habitability?.baseline_logistic_regression?.accuracy * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 font-semibold text-[#34C759] tabular-nums">
                    {(habitability?.random_forest?.accuracy * 100).toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 text-white/50">F1 Score</td>
                  <td className="py-2.5 tabular-nums">
                    {(habitability?.baseline_logistic_regression?.f1_weighted * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 font-semibold text-[#34C759] tabular-nums">
                    {(habitability?.random_forest?.f1_weighted * 100).toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Regression */}
          <div className="apple-glass-card rounded-2xl p-4 sm:p-5 space-y-3 border border-white/14">
            <h3 className="text-sm font-semibold text-white">
              Radius Regressor (Earth Radii)
            </h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/45 border-b border-white/10 text-left">
                  <th className="pb-2 font-medium">Metric</th>
                  <th className="pb-2 font-medium text-white/50">Linear Reg</th>
                  <th className="pb-2 font-medium text-[#007AFF]">Random Forest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-white/90">
                <tr>
                  <td className="py-2.5 text-white/50">RMSE</td>
                  <td className="py-2.5 tabular-nums">{radius?.baseline_linear_regression?.rmse?.toFixed(2)} R⊕</td>
                  <td className="py-2.5 font-semibold text-[#34C759] tabular-nums">
                    {radius?.random_forest?.rmse?.toFixed(2)} R⊕
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 text-white/50">R² Score</td>
                  <td className="py-2.5 tabular-nums">{radius?.baseline_linear_regression?.r2?.toFixed(2)}</td>
                  <td className="py-2.5 font-semibold text-[#34C759] tabular-nums">
                    {radius?.random_forest?.r2?.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 5 Held-Out Test Exoplanets */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-semibold text-white">
            Generalization on 5 Held-Out Test Worlds
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {samples.map((planet) => {
              const matched = planet.ground_truth_tier === planet.predicted_tier;
              return (
                <div
                  key={planet.name}
                  className="apple-glass-card rounded-2xl p-4 space-y-3 transition-all hover:bg-white/10 border border-white/12"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        {planet.name}
                      </h4>
                      <span className="text-[11px] text-white/50">
                        {planet.equilibrium_temp_k} K • {planet.orbital_period_days}d orbit
                      </span>
                    </div>

                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${getTierBadge(
                        planet.predicted_tier
                      )}`}
                    >
                      {planet.predicted_tier}
                    </span>
                  </div>

                  <div className="bg-white/[0.04] rounded-xl p-2.5 text-xs space-y-1.5 border border-white/[0.04]">
                    <div className="flex justify-between text-white/70">
                      <span className="text-white/45">Actual Radius</span>
                      <span className="font-semibold tabular-nums">{planet.actual_radius_earth} R⊕</span>
                    </div>
                    <div className="flex justify-between text-white/70">
                      <span className="text-white/45">Predicted Radius</span>
                      <span className="font-semibold text-white tabular-nums">{planet.predicted_radius_earth} R⊕</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-white/45 pt-0.5">
                    <span>Truth: {planet.ground_truth_tier}</span>
                    {matched && (
                      <span className="flex items-center gap-1 text-[#34C759] font-medium">
                        <CheckCircle2 size={12} /> Match
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
