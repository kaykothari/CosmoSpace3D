import React, { useState, useId, useRef, useEffect } from 'react';
import { Calendar, Clock, ChevronUp, RotateCcw, X } from 'lucide-react';

/**
 * Format simulated date object into clean macOS Sequoia style strings (UTC astronomical standard)
 */
function formatSimulatedDate(date) {
  if (!date || isNaN(date.getTime())) return { dateStr: '--', timeStr: '--' };

  const optionsDate = {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  };

  const optionsTime = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  };

  return {
    dateStr: new Intl.DateTimeFormat('en-US', optionsDate).format(date),
    timeStr: new Intl.DateTimeFormat('en-US', optionsTime).format(date),
  };
}

/**
 * Convert Date to datetime-local input string YYYY-MM-DDTHH:mm
 */
function toLocalInputString(date) {
  if (!date || isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function DateTimeDock({
  simulatedDate,
  setSimulatedDate,
  simulationSpeed,
  isPaused,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [customInputVal, setCustomInputVal] = useState(() => toLocalInputString(simulatedDate));
  const popoverRef = useRef(null);
  const inputId = useId();

  // Sync input value whenever popover opens or simulatedDate changes while closed
  useEffect(() => {
    if (!isOpen) {
      setCustomInputVal(toLocalInputString(simulatedDate));
    }
  }, [isOpen, simulatedDate]);

  // Escape key listener to close popover
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const { dateStr, timeStr } = formatSimulatedDate(simulatedDate);

  // Speed explanation calculations
  const getSpeedExplanation = () => {
    if (isPaused) {
      return { ratio: 'Clock Paused', multiplier: '0×', isPausedState: true };
    }
    switch (simulationSpeed) {
      case 1:
        return { ratio: '1s = 24 mins', multiplier: '1,440× speed', isPausedState: false };
      case 2:
        return { ratio: '1s = 48 mins', multiplier: '2,880× speed', isPausedState: false };
      case 5:
        return { ratio: '1s = 2.0 hrs', multiplier: '7,200× speed', isPausedState: false };
      default: {
        const mins = (1440 * simulationSpeed) / 60;
        return {
          ratio: `1s = ${mins >= 60 ? (mins / 60).toFixed(1) + ' hrs' : Math.round(mins) + ' mins'}`,
          multiplier: `${(1440 * simulationSpeed).toLocaleString()}× speed`,
          isPausedState: false,
        };
      }
    }
  };

  const speedInfo = getSpeedExplanation();

  const handleApplyCustomDate = (e) => {
    e.preventDefault();
    if (!customInputVal) return;
    const newDate = new Date(customInputVal + 'Z');
    if (!isNaN(newDate.getTime())) {
      setSimulatedDate(newDate);
    }
  };

  const holdTimeoutRef = useRef(null);
  const holdIntervalRef = useRef(null);
  const accelTimeoutRef = useRef(null);

  const stopHold = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    if (accelTimeoutRef.current) {
      clearTimeout(accelTimeoutRef.current);
      accelTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    const handleGlobalPointerUp = () => stopHold();
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      stopHold();
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, []);

  const startHold = (stepFn, amount) => {
    stopHold();
    // Fire immediately once
    stepFn(amount);

    // After 280ms initial hold delay, start continuous stepping
    holdTimeoutRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => {
        stepFn(amount);
      }, 70);

      // Accelerate after 1.2s of continuous hold
      accelTimeoutRef.current = setTimeout(() => {
        if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
        holdIntervalRef.current = setInterval(() => {
          stepFn(amount);
        }, 35);
      }, 1200);
    }, 280);
  };

  const handleStepHours = (hours) => {
    setSimulatedDate((prev) => {
      const current = new Date(prev);
      current.setUTCHours(current.getUTCHours() + hours);
      setCustomInputVal(toLocalInputString(current));
      return current;
    });
  };

  const handleStepDays = (days) => {
    setSimulatedDate((prev) => {
      const current = new Date(prev);
      current.setUTCDate(current.getUTCDate() + days);
      setCustomInputVal(toLocalInputString(current));
      return current;
    });
  };

  const handleStepYears = (years) => {
    setSimulatedDate((prev) => {
      const current = new Date(prev);
      current.setUTCFullYear(current.getUTCFullYear() + years);
      setCustomInputVal(toLocalInputString(current));
      return current;
    });
  };

  const stepRows = [
    { label: 'Hour', sublabel: '1 hr', stepFn: handleStepHours, amount: 1 },
    { label: 'Day', sublabel: '24 hrs', stepFn: handleStepDays, amount: 1 },
    { label: 'Week', sublabel: '7 days', stepFn: handleStepDays, amount: 7 },
    { label: 'Month', sublabel: '30 days', stepFn: handleStepDays, amount: 30 },
    { label: 'Year', sublabel: '365 days', stepFn: handleStepYears, amount: 1 },
  ];

  return (
    <div className="absolute bottom-4 right-4 z-20 pointer-events-auto" ref={popoverRef}>
      {/* Popover Sheet: Compact macOS Sequoia Window */}
      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 w-64 apple-glass rounded-xl p-3 shadow-2xl border border-white/10 text-white animate-in fade-in zoom-in-95 duration-150 select-none">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-[#007AFF]" />
              <span className="text-[12px] font-semibold text-white tracking-tight">
                Date & Time
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-5 h-5 rounded flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={11} />
            </button>
          </div>

          {/* Speed Acceleration Inset Card */}
          <div
            className={`mb-2.5 px-2 py-1.5 rounded-lg border flex items-center justify-between text-[11px] ${
              speedInfo.isPausedState
                ? 'bg-[#FF9F0A]/15 text-[#FF9F0A] border-[#FF9F0A]/25'
                : 'bg-white/5 text-white/90 border-white/8'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Clock size={12} className={speedInfo.isPausedState ? 'text-[#FF9F0A]' : 'text-[#30D158]'} />
              <span className="font-semibold text-white tracking-tight text-[11px]">
                {speedInfo.ratio}
              </span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/30 text-white/70">
              {isPaused ? 'PAUSED' : speedInfo.multiplier}
            </span>
          </div>

          {/* System Default Date & Time Picker Form */}
          <form onSubmit={handleApplyCustomDate} className="space-y-1.5 mb-2.5">
            <label htmlFor={inputId} className="block text-[10px] font-medium uppercase tracking-wider text-white/40 px-1">
              Pick Date & Time
            </label>
            <input
              id={inputId}
              type="datetime-local"
              value={customInputVal}
              onChange={(e) => {
                const val = e.target.value;
                setCustomInputVal(val);
                if (val && val.length >= 16) {
                  const newDate = new Date(val + 'Z');
                  if (!isNaN(newDate.getTime())) {
                    setSimulatedDate(newDate);
                  }
                }
              }}
              className="w-full bg-black/40 border border-white/15 rounded-md px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#007AFF] tabular-nums"
            />
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                type="submit"
                className="flex-1 py-1 px-2.5 bg-[#007AFF] hover:bg-[#0071E3] active:bg-[#005bb5] text-white rounded-md text-[11px] font-medium transition-colors shadow-xs"
              >
                Set Date & Time
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setSimulatedDate(now);
                  setCustomInputVal(toLocalInputString(now));
                }}
                className="py-1 px-2.5 bg-white/10 hover:bg-white/15 active:bg-white/20 text-white rounded-md text-[11px] font-medium transition-colors flex items-center gap-1"
                title="Sync to Current Real Time"
              >
                <RotateCcw size={10} className="text-[#007AFF]" />
                <span>Now</span>
              </button>
            </div>
          </form>

          {/* Quick Steppers: macOS Inset List */}
          <div className="space-y-1">
            <div className="text-[10px] font-medium uppercase tracking-wider text-white/40 px-1">
              Time Stepper
            </div>
            <div className="bg-white/5 rounded-lg border border-white/8 divide-y divide-white/6 overflow-hidden">
              {stepRows.map(({ label, sublabel, stepFn, amount }) => (
                <div key={label} className="flex items-center justify-between px-2.5 py-1 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/85 font-medium">{label}</span>
                    <span className="text-[9px] text-white/40">({sublabel})</span>
                  </div>
                  <div className="flex items-center bg-black/40 rounded border border-white/10 overflow-hidden">
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        startHold(stepFn, -amount);
                      }}
                      onPointerUp={stopHold}
                      onPointerLeave={stopHold}
                      onPointerCancel={stopHold}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          stepFn(-amount);
                        }
                      }}
                      className="px-2 py-0.5 text-[10px] text-white/70 hover:text-white hover:bg-white/15 active:bg-white/20 transition-colors border-r border-white/10 font-semibold select-none touch-none cursor-pointer"
                      title={`Rewind 1 ${label} (Hold to scrub)`}
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        startHold(stepFn, amount);
                      }}
                      onPointerUp={stopHold}
                      onPointerLeave={stopHold}
                      onPointerCancel={stopHold}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          stepFn(amount);
                        }
                      }}
                      className="px-2 py-0.5 text-[10px] text-white/70 hover:text-white hover:bg-white/15 active:bg-white/20 transition-colors font-semibold select-none touch-none cursor-pointer"
                      title={`Advance 1 ${label} (Hold to scrub)`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Dock Bar: macOS Sequoia Static Fixed-Width Pill (w-64 matches popover) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="apple-glass rounded-lg h-[34px] w-64 px-2.5 flex items-center justify-between shadow-lg border border-white/10 hover:bg-white/10 active:bg-white/15 transition-colors group cursor-pointer text-left select-none shrink-0"
        title="Click on the date to change it"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Clean Calendar Icon (No glowing dot) */}
          <Calendar size={13} className="text-white/70 group-hover:text-white transition-colors shrink-0" />

          {/* Clean Date & Running Time in Apple System Font */}
          <div className="flex items-center gap-1.5 text-[12px] leading-none whitespace-nowrap">
            <span className="font-semibold text-white tracking-tight">
              {dateStr}
            </span>
            <span className="text-white/30">·</span>
            <span className="font-medium text-white/90 tabular-nums">
              {timeStr}
            </span>
          </div>
        </div>

        {/* Dedicated Space for Collapsing Arrow Indicator */}
        <div className="flex items-center pl-2 ml-1 border-l border-white/10 shrink-0">
          <ChevronUp
            size={13}
            className={`text-white/45 group-hover:text-white/90 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>
    </div>
  );
}
