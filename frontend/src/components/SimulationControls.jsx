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
    <div className="absolute bottom-4 left-4 z-20 pointer-events-auto flex items-center gap-2">
      {/* macOS Sequoia Playback Dock */}
      <div className="apple-glass rounded-lg h-[34px] px-1 flex items-center gap-1.5 shadow-lg border border-white/10 text-[12px]">
        {/* Play / Pause - Fixed Size Icon Only */}
        <button
          onClick={() => setIsPaused(!isPaused)}
          className={`w-[26px] h-[26px] shrink-0 flex items-center justify-center rounded-md transition-colors ${
            isPaused
              ? 'bg-[#FF9F0A] text-white shadow-xs hover:bg-[#ffaa26]'
              : 'bg-white/10 hover:bg-white/15 active:bg-white/20 text-white'
          }`}
          title={isPaused ? 'Resume simulation (Space)' : 'Pause simulation (Space)'}
          aria-label={isPaused ? 'Resume simulation' : 'Pause simulation'}
        >
          {isPaused ? (
            <Play size={12} className="ml-0.5" fill="currentColor" />
          ) : (
            <Pause size={12} fill="currentColor" />
          )}
        </button>

        {/* Speed Selector */}
        <div className="h-[26px] flex items-center bg-black/30 rounded-md px-0.5 border border-white/6 gap-0.5">
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => setSimulationSpeed(s)}
              className={`h-[20px] px-2 flex items-center rounded text-[11px] font-medium transition-colors ${
                simulationSpeed === s
                  ? 'bg-white/20 text-white font-semibold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* macOS Reset Camera Compass Button */}
      <button
        onClick={onResetCamera}
        className="w-[34px] h-[34px] apple-glass rounded-lg flex items-center justify-center text-white/70 hover:text-white shadow-lg border border-white/10 transition-colors hover:bg-white/15"
        title="Reset Camera to System Overview"
      >
        <RotateCcw size={14} />
      </button>
    </div>
  );
}
