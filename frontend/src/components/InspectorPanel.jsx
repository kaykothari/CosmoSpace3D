import React, { useState, useEffect, useCallback } from 'react';
import { X, SlidersHorizontal, RotateCcw, Compass, Info } from 'lucide-react';
import { predictTelemetry } from '../services/api';

export default function InspectorPanel({ body, onClose }) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSliders, setShowSliders] = useState(false);

  const [customParams, setCustomParams] = useState({
    pl_bmasse: 1.0,
    pl_orbper: 365.25,
    pl_eqt: 255.0,
    st_mass: 1.0,
    st_rad: 1.0,
    st_teff: 5778.0,
    pl_rade: 1.0
  });

  const runPrediction = useCallback(async (params) => {
    if (!body) return;
    setLoading(true);
    try {
      const res = await predictTelemetry({
        pl_bmasse: Number(params.pl_bmasse),
        pl_orbper: Number(params.pl_orbper),
        pl_eqt: Number(params.pl_eqt),
        st_mass: Number(params.st_mass ?? 1.0),
        st_rad: Number(params.st_rad ?? 1.0),
        st_teff: Number(params.st_teff ?? 5778.0),
        pl_rade: Number(params.pl_rade ?? 1.0)
      });
      setPrediction(res);
    } catch (err) {
      console.error('Prediction failed:', err);
    } finally {
      setLoading(false);
    }
  }, [body]);

  useEffect(() => {
    if (body) {
      const initial = {
        pl_bmasse: body.pl_bmasse ?? 1.0,
        pl_orbper: body.pl_orbper ?? 365.25,
        pl_eqt: body.pl_eqt ?? 255.0,
        st_mass: body.st_mass ?? 1.0,
        st_rad: body.st_rad ?? 1.0,
        st_teff: body.st_teff ?? 5778.0,
        pl_rade: body.pl_rade ?? 1.0
      };
      setCustomParams(initial);
      setShowSliders(false);
      runPrediction(initial);
    }
  }, [body, runPrediction]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!body) return null;

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

  return (
    <aside className="absolute top-16 left-4 bottom-4 w-80 max-w-[90vw] apple-glass-card rounded-xl z-30 flex flex-col text-white shadow-2xl overflow-hidden border border-white/12">
      {/* Header (macOS Sequoia Inspector Header) */}
      <div className="px-4 py-3 border-b border-white/8 flex items-start justify-between bg-black/20">
        <div>
          <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
            {body.orbitTarget ? `Moon of ${body.orbitTarget.toUpperCase()}` : body.designation}
          </div>
          <h2 className="text-[17px] font-semibold text-white tracking-tight mt-0.5">
            {body.name}
          </h2>
          <div className="text-[11px] text-white/55 font-normal">
            {body.type}
          </div>
        </div>

        {/* macOS Window Close Button */}
        <button
          onClick={onClose}
          className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white flex items-center justify-center transition-colors"
          title="Close (Esc)"
        >
          <X size={11} />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {/* Description */}
        <p className="text-[12px] text-white/75 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/6">
          {body.description}
        </p>

        {/* macOS Settings Inset Grouped Key Facts */}
        <div>
          <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1.5 px-0.5">
            Characteristics
          </h3>
          <div className="bg-black/25 rounded-lg border border-white/8 overflow-hidden text-[12px] divide-y divide-white/6">
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-white/50">Orbit Radius</span>
              <span className="font-medium text-white tabular-nums">
                {body.orbitTarget
                  ? `${body.orbitRadius} units`
                  : body.semi_major_axis_au > 0
                  ? `${body.semi_major_axis_au} AU`
                  : 'Center of System'}
              </span>
            </div>
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-white/50">Orbital Period</span>
              <span className="font-medium text-white tabular-nums">
                {body.pl_orbper > 0 ? `${body.pl_orbper.toLocaleString()} days` : 'N/A'}
              </span>
            </div>
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-white/50">Radius</span>
              <span className="font-medium text-white tabular-nums">{body.pl_rade} R⊕</span>
            </div>
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-white/50">Mass</span>
              <span className="font-medium text-white tabular-nums">{body.pl_bmasse.toLocaleString()} M⊕</span>
            </div>
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-white/50">Equilibrium Temp</span>
              <span className="font-medium text-white tabular-nums">
                {body.pl_eqt} K ({Math.round(body.pl_eqt - 273.15)}°C)
              </span>
            </div>
            {body.axialTilt !== undefined && (
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-white/50">Axial Tilt</span>
                <span className="font-medium text-white tabular-nums">{body.axialTilt}°</span>
              </div>
            )}
          </div>
        </div>

        {/* Machine Learning Telemetry Card */}
        <div className="bg-black/25 rounded-lg p-3 border border-white/8 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-white">
              Habitability Model
            </span>
            <button
              onClick={() => setShowSliders(!showSliders)}
              className="text-[11px] font-medium text-[#007AFF] hover:text-[#38a0ff] flex items-center gap-1 transition-colors"
            >
              <SlidersHorizontal size={11} />
              <span>{showSliders ? 'Hide Sliders' : 'Simulate'}</span>
            </button>
          </div>

          {/* macOS Style Simulator Sliders */}
          {showSliders && (
            <div className="p-2.5 bg-black/40 rounded-lg space-y-2.5 text-[12px] border border-white/8">
              <div className="flex items-center justify-between text-white/50 text-[11px]">
                <span>Hypothetical values:</span>
                <button
                  onClick={() => {
                    const reset = {
                      pl_bmasse: body.pl_bmasse ?? 1.0,
                      pl_orbper: body.pl_orbper ?? 365.25,
                      pl_eqt: body.pl_eqt ?? 255.0,
                      st_mass: 1.0,
                      st_rad: 1.0,
                      st_teff: 5778.0,
                      pl_rade: body.pl_rade ?? 1.0
                    };
                    setCustomParams(reset);
                    runPrediction(reset);
                  }}
                  className="text-white/50 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <RotateCcw size={10} /> Reset
                </button>
              </div>

              <div>
                <div className="flex justify-between text-white/70 text-[11px] mb-1">
                  <span>Mass:</span>
                  <span className="font-medium text-white tabular-nums">{customParams.pl_bmasse} M⊕</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="50"
                  step="0.05"
                  value={customParams.pl_bmasse}
                  onChange={(e) => {
                    const updated = { ...customParams, pl_bmasse: parseFloat(e.target.value) };
                    setCustomParams(updated);
                    runPrediction(updated);
                  }}
                />
              </div>

              <div>
                <div className="flex justify-between text-white/70 text-[11px] mb-1">
                  <span>Temperature:</span>
                  <span className="font-medium text-white tabular-nums">{customParams.pl_eqt} K</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="900"
                  step="5"
                  value={customParams.pl_eqt}
                  onChange={(e) => {
                    const updated = { ...customParams, pl_eqt: parseFloat(e.target.value) };
                    setCustomParams(updated);
                    runPrediction(updated);
                  }}
                />
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-2 text-center text-[12px] text-white/40">
              Running model...
            </div>
          ) : prediction ? (
            <div className="space-y-2 text-[12px]">
              <div className="bg-black/30 p-2.5 rounded-lg border border-white/6 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-white/40 block uppercase font-medium">Classification</span>
                  <span
                    className={`inline-block mt-0.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${getTierBadge(
                      prediction.habitability_tier
                    )}`}
                  >
                    {prediction.habitability_tier}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-white/40 block uppercase font-medium">ESI Score</span>
                  <span className="text-[13px] font-semibold text-white mt-0.5 block tabular-nums">
                    {prediction.esi_score.toFixed(2)}
                    <span className="text-[11px] text-white/40 font-normal"> / 1.0</span>
                  </span>
                </div>
              </div>

              <div className="bg-black/30 p-2.5 rounded-lg border border-white/6 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-white/40 block uppercase font-medium">Model Predicted Radius</span>
                  <span className="text-[13px] font-medium text-white mt-0.5 block tabular-nums">
                    {prediction.predicted_radius} R⊕
                  </span>
                </div>
                {prediction.actual_radius && (
                  <div className="text-right">
                    <span className="text-[10px] text-white/40 block uppercase font-medium">Actual</span>
                    <span className="text-[11px] text-white/70 font-normal mt-0.5 block tabular-nums">
                      {prediction.actual_radius} R⊕
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
