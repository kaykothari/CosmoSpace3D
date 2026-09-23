import React, { useState, useEffect, useMemo } from 'react';
import { SlidersHorizontal, RotateCcw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { predictTelemetry } from '../services/api';

// Simple, recognizable discovery presets
const PRESETS = [
  {
    name: 'Earth',
    params: { pl_bmasse: 1.0, pl_eqt: 255, pl_orbper: 365.25, st_mass: 1.0, st_rad: 1.0, st_teff: 5778 }
  },
  {
    name: 'Mars',
    params: { pl_bmasse: 0.107, pl_eqt: 210, pl_orbper: 687.0, st_mass: 1.0, st_rad: 1.0, st_teff: 5778 }
  },
  {
    name: 'Jupiter',
    params: { pl_bmasse: 317.8, pl_eqt: 110, pl_orbper: 4332.6, st_mass: 1.0, st_rad: 1.0, st_teff: 5778 }
  },
  {
    name: 'TRAPPIST-1e',
    params: { pl_bmasse: 0.69, pl_eqt: 251, pl_orbper: 6.1, st_mass: 0.09, st_rad: 0.12, st_teff: 2566 }
  },
  {
    name: 'Kepler-452b',
    params: { pl_bmasse: 5.0, pl_eqt: 265, pl_orbper: 384.8, st_mass: 1.04, st_rad: 1.11, st_teff: 5757 }
  },
  {
    name: 'Proxima Centauri b',
    params: { pl_bmasse: 1.17, pl_eqt: 234, pl_orbper: 11.2, st_mass: 0.12, st_rad: 0.14, st_teff: 3042 }
  }
];

export default function ModelValidationView() {
  const [params, setParams] = useState({
    pl_bmasse: 1.0,
    pl_eqt: 255,
    pl_orbper: 365.25,
    st_mass: 1.0,
    st_rad: 1.0,
    st_teff: 5778
  });

  const [activePreset, setActivePreset] = useState('Earth');
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  // Debounced prediction call
  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await predictTelemetry(params);
        if (!cancelled) {
          setPrediction(res);
        }
      } catch (err) {
        console.error('Prediction failed:', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [params]);

  const handlePresetClick = (preset) => {
    setActivePreset(preset.name);
    setParams({ ...preset.params });
  };

  const handleInputChange = (field, value) => {
    setActivePreset('Custom');
    setParams((prev) => ({
      ...prev,
      [field]: Number(value)
    }));
  };

  const handleReset = () => {
    handlePresetClick(PRESETS[0]);
  };

  // Planetary scale classification
  const radiusCategory = useMemo(() => {
    const r = prediction?.predicted_radius || 1.0;
    if (r < 0.8) return 'Sub-Earth (< 0.8 R⊕)';
    if (r <= 1.25) return 'Earth-Size (0.8 - 1.25 R⊕)';
    if (r <= 2.0) return 'Super-Earth (1.25 - 2.0 R⊕)';
    if (r <= 4.0) return 'Sub-Neptune (2.0 - 4.0 R⊕)';
    return 'Gas Giant (> 4.0 R⊕)';
  }, [prediction?.predicted_radius]);

  const tier = prediction?.habitability_tier || 'Uninhabitable';
  const probs = prediction?.probabilities || {};
  const pEarth = Math.round((probs['Earth-Like'] || 0) * 100);
  const pSub = Math.round((probs['Sub-Surface'] || 0) * 100);
  const pUninhab = Math.max(0, 100 - pEarth - pSub);
  const predRadius = prediction?.predicted_radius ?? 1.0;

  // True relative physical scale calculation (larger body takes max slot, smaller scales proportionally)
  const { earthSize, targetSize } = useMemo(() => {
    const rTarget = Math.max(0.05, predRadius);
    const rEarth = 1.0;
    const maxR = Math.max(rEarth, rTarget);
    const MAX_SLOT = 56; // max circle diameter in px
    const MIN_SIZE = 6;  // minimum visible dot in px

    const scale = MAX_SLOT / maxR;
    const dEarth = Math.max(MIN_SIZE, Math.round(rEarth * scale));
    const dTarget = Math.max(MIN_SIZE, Math.round(rTarget * scale));

    return { earthSize: dEarth, targetSize: dTarget };
  }, [predRadius]);

  return (
    <div className="w-full h-full overflow-y-auto bg-[#050608] pt-18 pb-16 px-4 sm:px-6 lg:px-8 text-white select-none">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Apple Native Clean Header (No Box / No SaaS Banner) */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-2 border-b border-white/8">
          <div>
            <h1 className="text-[18px] font-semibold text-white tracking-tight leading-snug">
              Habitability & Radius Predictor
            </h1>
            <p className="text-[12px] text-white/50 mt-0.5 font-normal">
              Telemetry inference engine trained on 4,749 NASA Exoplanet Archive records
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Apple Segmented Quick Presets */}
            <div className="apple-glass rounded-lg h-[32px] px-1 flex items-center shadow-sm border border-white/10 overflow-x-auto no-scrollbar">
              {PRESETS.map((p) => {
                const isSelected = activePreset === p.name;
                return (
                  <button
                    key={p.name}
                    onClick={() => handlePresetClick(p)}
                    className={`px-2.5 h-[24px] flex items-center rounded-md text-[12px] font-medium transition-colors shrink-0 ${
                      isSelected
                        ? 'bg-[#007AFF] text-white shadow-xs font-medium'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}

              {/* Custom Preset Pill */}
              <button
                onClick={() => setActivePreset('Custom')}
                className={`px-2.5 h-[24px] flex items-center rounded-md text-[12px] font-medium transition-colors shrink-0 ${
                  activePreset === 'Custom'
                    ? 'bg-[#007AFF] text-white shadow-xs font-medium'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                Custom
              </button>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="apple-glass hover:bg-white/10 active:bg-white/15 text-white/70 hover:text-white h-[32px] px-2.5 rounded-lg text-[12px] font-medium flex items-center gap-1.5 transition-colors border border-white/10 shrink-0"
              title="Reset parameters to Earth baseline"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* 2-Column Grid: Inputs on Left, Results on Right */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column: Parameter Inputs */}
          <div className="apple-glass-card rounded-xl p-4 sm:p-4.5 border border-white/10 space-y-3.5">
            <div className="flex items-center gap-2 border-b border-white/8 pb-2">
              <SlidersHorizontal size={13} className="text-[#007AFF]" />
              <h2 className="text-[13px] font-semibold text-white tracking-tight">Input Parameters</h2>
            </div>

            {/* Planetary Controls */}
            <div className="space-y-3">
              <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider px-0.5">
                Planetary Telemetry
              </div>

              {/* Mass */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[12px]">
                  <label className="text-white/70 font-medium">Planetary Mass</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0.01"
                      max="3500"
                      step="0.01"
                      value={params.pl_bmasse}
                      onChange={(e) => handleInputChange('pl_bmasse', e.target.value)}
                      className="w-20 bg-black/40 border border-white/15 rounded-md px-2 py-0.5 text-right text-[12px] text-white focus:outline-none focus:border-[#007AFF] tabular-nums"
                    />
                    <span className="text-[11px] text-white/40">M⊕</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="350"
                  step="0.05"
                  value={Math.min(350, params.pl_bmasse)}
                  onChange={(e) => handleInputChange('pl_bmasse', e.target.value)}
                  className="w-full accent-[#007AFF]"
                />
              </div>

              {/* Equilibrium Temp */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[12px]">
                  <label className="text-white/70 font-medium">Equilibrium Temperature</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="30"
                      max="3000"
                      step="1"
                      value={params.pl_eqt}
                      onChange={(e) => handleInputChange('pl_eqt', e.target.value)}
                      className="w-20 bg-black/40 border border-white/15 rounded-md px-2 py-0.5 text-right text-[12px] text-white focus:outline-none focus:border-[#007AFF] tabular-nums"
                    />
                    <span className="text-[11px] text-white/40">K</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1500"
                  step="5"
                  value={Math.min(1500, params.pl_eqt)}
                  onChange={(e) => handleInputChange('pl_eqt', e.target.value)}
                  className="w-full accent-[#007AFF]"
                />
              </div>

              {/* Orbital Period */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[12px]">
                  <label className="text-white/70 font-medium">Orbital Period</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0.1"
                      max="10000"
                      step="0.1"
                      value={params.pl_orbper}
                      onChange={(e) => handleInputChange('pl_orbper', e.target.value)}
                      className="w-20 bg-black/40 border border-white/15 rounded-md px-2 py-0.5 text-right text-[12px] text-white focus:outline-none focus:border-[#007AFF] tabular-nums"
                    />
                    <span className="text-[11px] text-white/40">days</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1000"
                  step="0.5"
                  value={Math.min(1000, params.pl_orbper)}
                  onChange={(e) => handleInputChange('pl_orbper', e.target.value)}
                  className="w-full accent-[#007AFF]"
                />
              </div>
            </div>

            {/* Stellar Controls */}
            <div className="space-y-3 pt-2.5 border-t border-white/6">
              <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider px-0.5">
                Host Star Telemetry
              </div>

              {/* Star Mass */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[12px]">
                  <label className="text-white/70 font-medium">Star Mass</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0.08"
                      max="3.0"
                      step="0.01"
                      value={params.st_mass}
                      onChange={(e) => handleInputChange('st_mass', e.target.value)}
                      className="w-20 bg-black/40 border border-white/15 rounded-md px-2 py-0.5 text-right text-[12px] text-white focus:outline-none focus:border-[#007AFF] tabular-nums"
                    />
                    <span className="text-[11px] text-white/40">M☉</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.08"
                  max="2.5"
                  step="0.01"
                  value={params.st_mass}
                  onChange={(e) => handleInputChange('st_mass', e.target.value)}
                  className="w-full accent-[#007AFF]"
                />
              </div>

              {/* Star Radius */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[12px]">
                  <label className="text-white/70 font-medium">Star Radius</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0.1"
                      max="5.0"
                      step="0.01"
                      value={params.st_rad}
                      onChange={(e) => handleInputChange('st_rad', e.target.value)}
                      className="w-20 bg-black/40 border border-white/15 rounded-md px-2 py-0.5 text-right text-[12px] text-white focus:outline-none focus:border-[#007AFF] tabular-nums"
                    />
                    <span className="text-[11px] text-white/40">R☉</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3.5"
                  step="0.02"
                  value={params.st_rad}
                  onChange={(e) => handleInputChange('st_rad', e.target.value)}
                  className="w-full accent-[#007AFF]"
                />
              </div>

              {/* Star Temp */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[12px]">
                  <label className="text-white/70 font-medium">Effective Temperature</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="2000"
                      max="9000"
                      step="50"
                      value={params.st_teff}
                      onChange={(e) => handleInputChange('st_teff', e.target.value)}
                      className="w-20 bg-black/40 border border-white/15 rounded-md px-2 py-0.5 text-right text-[12px] text-white focus:outline-none focus:border-[#007AFF] tabular-nums"
                    />
                    <span className="text-[11px] text-white/40">K</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="2400"
                  max="8000"
                  step="50"
                  value={params.st_teff}
                  onChange={(e) => handleInputChange('st_teff', e.target.value)}
                  className="w-full accent-[#007AFF]"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Model Output */}
          <div className="space-y-3.5">
            {/* Primary Result Box */}
            <div className="apple-glass-card rounded-xl p-4 sm:p-4.5 border border-white/10 space-y-3.5">
              <div className="flex items-center justify-between border-b border-white/8 pb-2">
                <h2 className="text-[13px] font-semibold text-white tracking-tight">Model Predictions</h2>
                {loading ? (
                  <span className="text-[11px] text-white/40 animate-pulse">Running model...</span>
                ) : (
                  <span className="text-[11px] text-[#34C759] font-medium">Ready</span>
                )}
              </div>

              {/* Habitability Classification Row */}
              <div className="bg-black/25 rounded-lg p-3 border border-white/8 space-y-1.5">
                <div className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                  Classification
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {tier === 'Earth-Like' && (
                      <span className="px-2.5 py-1 rounded-md text-[13px] font-semibold bg-[#34C759]/20 text-[#34C759] border border-[#34C759]/40 flex items-center gap-1.5">
                        <CheckCircle2 size={14} />
                        Earth-Like
                      </span>
                    )}
                    {tier === 'Sub-Surface' && (
                      <span className="px-2.5 py-1 rounded-md text-[13px] font-semibold bg-[#FF9F0A]/20 text-[#FF9F0A] border border-[#FF9F0A]/40 flex items-center gap-1.5">
                        <AlertTriangle size={14} />
                        Sub-Surface Candidate
                      </span>
                    )}
                    {tier === 'Uninhabitable' && (
                      <span className="px-2.5 py-1 rounded-md text-[13px] font-semibold bg-white/10 text-white/70 border border-white/15 flex items-center gap-1.5">
                        <XCircle size={14} />
                        Uninhabitable
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-white/40 tabular-nums">
                    {Math.round((prediction?.confidence || 0.85) * 100)}% confidence
                  </span>
                </div>
              </div>

              {/* Stats Grid: ESI & Radius */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Earth Similarity Index */}
                <div className="bg-black/25 rounded-lg p-3 border border-white/8">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                    Earth Similarity
                  </div>
                  <div className="text-[18px] font-semibold text-white mt-1 tabular-nums">
                    {(prediction?.esi_score ?? 0).toFixed(2)}
                    <span className="text-[11px] text-white/40 font-normal"> / 1.0</span>
                  </div>
                </div>

                {/* Predicted Radius */}
                <div className="bg-black/25 rounded-lg p-3 border border-white/8">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                    Predicted Radius
                  </div>
                  <div className="text-[18px] font-semibold text-[#007AFF] mt-1 tabular-nums">
                    {predRadius}
                    <span className="text-[11px] text-white/40 font-normal"> R⊕</span>
                  </div>
                </div>
              </div>

              {/* Visual Scale Comparison (Static Box) */}
              <div className="bg-black/25 rounded-lg p-3 border border-white/8 space-y-2 h-[152px] flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] shrink-0">
                  <span className="text-white/45 text-[10px] uppercase font-medium tracking-wider">
                    Physical Size Comparison
                  </span>
                  <span className="text-white/75 font-medium truncate max-w-[180px]">{radiusCategory}</span>
                </div>

                <div className="flex items-center justify-around bg-black/30 rounded-md border border-white/6 h-[100px] px-2 shrink-0">
                  {/* Earth Baseline */}
                  <div className="flex flex-col items-center justify-center w-28">
                    <div className="h-[62px] flex items-center justify-center">
                      <div
                        className="rounded-full bg-[#0284c7]/40 border border-[#38bdf8]/60 shadow-xs transition-all duration-300"
                        style={{
                          width: `${earthSize}px`,
                          height: `${earthSize}px`
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-white/50 leading-none mt-1">Earth (1.0 R⊕)</span>
                  </div>

                  <span className="text-white/20 text-[11px] mb-3">vs</span>

                  {/* Target Planet */}
                  <div className="flex flex-col items-center justify-center w-28">
                    <div className="h-[62px] flex items-center justify-center">
                      <div
                        className="rounded-full transition-all duration-300 border border-white/25 shadow-md"
                        style={{
                          width: `${targetSize}px`,
                          height: `${targetSize}px`,
                          backgroundColor:
                            tier === 'Earth-Like'
                              ? '#0284c7'
                              : tier === 'Sub-Surface'
                              ? '#d97706'
                              : '#475569'
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-[#007AFF] font-medium leading-none mt-1 truncate max-w-[110px]">
                      Target ({predRadius} R⊕)
                    </span>
                  </div>
                </div>
              </div>

              {/* Probability Breakdown */}
              <div className="space-y-1.5 pt-0.5">
                <div className="text-[10px] font-medium uppercase tracking-wider text-white/40 flex justify-between">
                  <span>Class Probabilities</span>
                  <span className="text-white/30 lowercase">random forest</span>
                </div>

                <div className="bg-black/25 rounded-lg p-2.5 border border-white/6 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Earth-Like</span>
                    <span className="text-[#34C759] font-medium tabular-nums">{pEarth}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div style={{ width: `${pEarth}%` }} className="h-full bg-[#34C759]" />
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-white/70">Sub-Surface</span>
                    <span className="text-[#FF9F0A] font-medium tabular-nums">{pSub}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div style={{ width: `${pSub}%` }} className="h-full bg-[#FF9F0A]" />
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-white/70">Uninhabitable</span>
                    <span className="text-white/50 font-medium tabular-nums">{pUninhab}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div style={{ width: `${pUninhab}%` }} className="h-full bg-white/40" />
                  </div>
                </div>
              </div>

              {/* Assessment Note */}
              {prediction?.hazard_assessment && (
                <div className="bg-black/20 rounded-lg p-2.5 border border-white/6 text-[12px] text-white/70 leading-relaxed">
                  <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">
                    Assessment Note
                  </div>
                  {prediction.hazard_assessment}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
