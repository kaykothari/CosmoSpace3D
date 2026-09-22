import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

export default function SimulationControls({
  isPaused,
  setIsPaused,
  simulationSpeed,
  setSimulationSpeed,
  onResetCamera
}) {
  const speeds = [1, 2, 5];

  return (
    <div className="absolute bottom-5 right-5 z-20 pointer-events-auto flex items-center gap-2.5">
      {/* Apple Maps Style Playback Dock */}
      <div className="apple-glass rounded-full p-1.5 flex items-center gap-2 shadow-2xl border border-white/12 text-xs">
        {/* Play / Pause */}
        <button
          onClick={() => setIsPaused(!isPaused)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition-all ${
            isPaused
              ? 'bg-[#FF9F0A] text-white shadow-xs font-semibold'
              : 'bg-white/10 hover:bg-white/15 active:bg-white/20 text-white'
          }`}
        >
          {isPaused ? <Play size={13} fill="currentColor" /> : <Pause size={13} />}
          <span>{isPaused ? 'Resume' : 'Pause'}</span>
        </button>

        {/* Speed Selector */}
        <div className="flex items-center bg-black/40 rounded-full p-0.5 border border-white/5">
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => setSimulationSpeed(s)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                simulationSpeed === s
                  ? 'bg-white/20 text-white font-semibold shadow-xs'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Apple Maps Reset Camera Compass */}
      <button
        onClick={onResetCamera}
        className="w-10 h-10 apple-glass rounded-full flex items-center justify-center text-white/70 hover:text-white shadow-2xl border border-white/12 transition-all hover:bg-white/15 active:scale-95"
        title="Reset Camera to System Overview"
      >
        <RotateCcw size={15} />
      </button>
    </div>
  );
}
