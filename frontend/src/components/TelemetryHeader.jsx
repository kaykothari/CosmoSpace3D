import React, { useState, useEffect, useRef } from 'react';
import { Search, Compass, BarChart3, ChevronDown, X } from 'lucide-react';

export default function TelemetryHeader({
  activeView,
  setActiveView,
  selectedBodyId,
  onSelectBody,
  celestialBodies = []
}) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'planet' | 'moon'
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedBody = celestialBodies.find((b) => b.id === selectedBodyId);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  const filteredBodies = celestialBodies.filter((b) => {
    if (filterType === 'planet' && (b.orbitTarget || b.id === 'sun')) return false;
    if (filterType === 'moon' && !b.orbitTarget) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return b.name.toLowerCase().includes(q) || b.type.toLowerCase().includes(q) || (b.orbitTarget && b.orbitTarget.toLowerCase().includes(q));
    }
    return true;
  });

  const planetListIds = [
    'sun',
    'mercury',
    'venus',
    'earth',
    'moon',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'pluto'
  ];

  return (
    <header className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex items-center justify-between">
      {/* 1. TOP LEFT: macOS Sequoia Mode Switcher (Capsule) */}
      <div className="flex items-center shrink-0 pointer-events-auto">
        <div className="apple-glass rounded-full p-1 flex items-center shadow-xl border border-white/12">
          <button
            onClick={() => setActiveView('orbit')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full transition-all ${
              activeView === 'orbit'
                ? 'bg-white/15 text-white shadow-xs border border-white/10 font-semibold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Compass size={13} />
            <span>3D Solar System</span>
          </button>
          <button
            onClick={() => setActiveView('validation')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full transition-all ${
              activeView === 'validation'
                ? 'bg-white/15 text-white shadow-xs border border-white/10 font-semibold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <BarChart3 size={13} />
            <span>Model Evaluation</span>
          </button>
        </div>
      </div>

      {/* 2. TOP CENTER: Independent Centered Planet Navigation Dock (Only in Orbit View) */}
      {activeView === 'orbit' && (
        <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 top-0 pointer-events-auto">
          <div className="apple-glass rounded-full px-2 py-1.5 flex items-center gap-1 shadow-2xl border border-white/12 whitespace-nowrap">
            {planetListIds.map((id) => {
              const body = celestialBodies.find((b) => b.id === id);
              if (!body) return null;
              const isSelected = selectedBodyId === id;
              return (
                <button
                  key={id}
                  onClick={() => onSelectBody(isSelected ? null : id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
                    isSelected
                      ? 'bg-[#007AFF] text-white shadow-sm font-semibold'
                      : 'text-white/70 hover:text-white hover:bg-white/10 active:bg-white/15'
                  }`}
                >
                  {body.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. TOP RIGHT: Fixed-Width Search Pill & Dropdown (Only in Orbit View) */}
      {activeView === 'orbit' ? (
        <div className="flex items-center justify-end shrink-0 pointer-events-auto relative" ref={dropdownRef}>
          {/* Strictly Static Size Search Pill - Always Displays "Search Celestial Body" Only */}
          <div
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-56 sm:w-60 apple-glass rounded-full px-3.5 py-1.5 flex items-center justify-between cursor-pointer shadow-xl border border-white/12 transition-all hover:bg-white/10 text-xs shrink-0 select-none"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search size={14} className="text-white/50 shrink-0" />
              <span className="text-white/80 font-medium whitespace-nowrap">
                Search Celestial Body
              </span>
            </div>

            <ChevronDown
              size={13}
              className={`text-white/40 shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180 text-white/80' : ''}`}
            />
          </div>

          {/* macOS Sequoia Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute top-11 right-0 w-72 apple-glass-card rounded-2xl p-2.5 shadow-2xl border border-white/14 z-30">
              {/* Search text input */}
              <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 mb-2 text-xs">
                <Search size={12} className="text-white/40 shrink-0" />
                <input
                  type="text"
                  placeholder="Filter celestial bodies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-white placeholder-white/40 outline-none w-full text-xs"
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-white/40 hover:text-white">
                    <X size={11} />
                  </button>
                )}
              </div>

              {/* Category Segmented Filter */}
              <div className="flex items-center bg-black/30 rounded-xl p-0.5 border border-white/5 mb-2 text-[11px]">
                <button
                  onClick={() => setFilterType('all')}
                  className={`flex-1 py-1 rounded-lg text-center font-medium transition-all ${
                    filterType === 'all' ? 'bg-[#007AFF] text-white shadow-xs' : 'text-white/50 hover:text-white'
                  }`}
                >
                  All ({celestialBodies.length})
                </button>
                <button
                  onClick={() => setFilterType('planet')}
                  className={`flex-1 py-1 rounded-lg text-center font-medium transition-all ${
                    filterType === 'planet' ? 'bg-[#007AFF] text-white shadow-xs' : 'text-white/50 hover:text-white'
                  }`}
                >
                  Planets
                </button>
                <button
                  onClick={() => setFilterType('moon')}
                  className={`flex-1 py-1 rounded-lg text-center font-medium transition-all ${
                    filterType === 'moon' ? 'bg-[#007AFF] text-white shadow-xs' : 'text-white/50 hover:text-white'
                  }`}
                >
                  Moons
                </button>
              </div>

              {/* Scrollable Body List */}
              <div className="space-y-0.5 max-h-72 overflow-y-auto pr-0.5">
                {filteredBodies.length === 0 ? (
                  <div className="py-4 text-center text-xs text-white/40">No bodies match "{searchQuery}"</div>
                ) : (
                  filteredBodies.map((b) => {
                    const isSelected = selectedBodyId === b.id;
                    return (
                      <button
                        key={b.id}
                        onClick={() => {
                          onSelectBody(b.id);
                          setIsDropdownOpen(false);
                          setSearchQuery('');
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                          isSelected ? 'bg-[#007AFF] text-white font-medium' : 'text-white/80 hover:bg-white/10'
                        }`}
                      >
                        <span className="font-medium">{b.name}</span>
                        <span className="text-[10px] text-white/40">
                          {b.orbitTarget ? `Moon of ${b.orbitTarget.toUpperCase()}` : b.type.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div />
      )}
    </header>
  );
}
