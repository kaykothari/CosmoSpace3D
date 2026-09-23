import React, { useState, useEffect, useRef } from 'react';
import { Search, Compass, FlaskConical, ChevronDown, X } from 'lucide-react';

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
    if (filterType === 'planet') return !b.orbitTarget && b.id !== 'sun';
    if (filterType === 'moon') return Boolean(b.orbitTarget);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        b.name.toLowerCase().includes(q) ||
        b.type.toLowerCase().includes(q) ||
        (b.orbitTarget && b.orbitTarget.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // 10 primary bodies (Moon removed per user request)
  const planetListIds = [
    'sun',
    'mercury',
    'venus',
    'earth',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'pluto'
  ];

  return (
    <header className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
      {/* Top Left: macOS Sequoia Mode Switcher */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <div className="apple-glass rounded-lg h-[34px] px-1 flex items-center shadow-lg border border-white/10">
          <button
            onClick={() => setActiveView('orbit')}
            className={`flex items-center gap-1.5 px-3 h-[26px] text-[12px] font-medium rounded-md transition-colors ${
              activeView === 'orbit'
                ? 'bg-[#3a3a3c] text-white shadow-xs border border-white/10 font-medium'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Compass size={13} />
            <span>3D Solar System</span>
          </button>
          <button
            onClick={() => setActiveView('validation')}
            className={`flex items-center gap-1.5 px-3 h-[26px] text-[12px] font-medium rounded-md transition-colors ${
              activeView === 'validation'
                ? 'bg-[#3a3a3c] text-white shadow-xs border border-white/10 font-medium'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <FlaskConical size={13} />
            <span>Exoplanet ML Lab</span>
          </button>
        </div>
      </div>

      {/* Top Right: macOS Sequoia Planet Segment Strip + Search Field */}
      {activeView === 'orbit' ? (
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Quick Planet Navigation Strip (Moon removed; Sun + 9 planets) */}
          <div className="hidden lg:flex items-center gap-0.5 apple-glass rounded-lg h-[34px] px-1 shadow-lg border border-white/10 whitespace-nowrap shrink-0">
            {planetListIds.map((id) => {
              const body = celestialBodies.find((b) => b.id === id);
              if (!body) return null;
              const isSelected = selectedBodyId === id;
              return (
                <button
                  key={id}
                  onClick={() => onSelectBody(isSelected ? null : id)}
                  className={`px-2.5 h-[26px] flex items-center rounded-md text-[12px] font-medium transition-colors shrink-0 ${
                    isSelected
                      ? 'bg-[#007AFF] text-white shadow-xs font-medium'
                      : 'text-white/70 hover:text-white hover:bg-white/10 active:bg-white/15'
                  }`}
                >
                  {body.name}
                </button>
              );
            })}
          </div>

          {/* macOS Sequoia Search Field (Fixed w-64 width matching dropdown menu) */}
          <div className="relative w-64" ref={dropdownRef}>
            <div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="apple-glass rounded-lg h-[34px] w-full px-2.5 flex items-center gap-2 cursor-pointer shadow-lg border border-white/10 transition-colors hover:bg-white/10 text-[12px] justify-between select-none"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
                <Search size={13} className="text-white/45 shrink-0" />
                <span className="font-normal text-white truncate">
                  {selectedBody ? selectedBody.name : 'Search Celestial Body'}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {selectedBody && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBody(null);
                    }}
                    className="w-3.5 h-3.5 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors text-[9px] mr-0.5"
                    title="Clear selection"
                  >
                    <X size={9} strokeWidth={2.5} />
                  </button>
                )}
                <ChevronDown
                  size={12}
                  className={`text-white/45 shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180 text-white' : ''}`}
                />
              </div>
            </div>

            {/* macOS Sequoia Context Menu Dropdown */}
            {isDropdownOpen && (
              <div className="absolute top-full mt-2 right-0 w-full apple-glass-card rounded-lg p-2 shadow-2xl z-30 border border-white/12 overflow-hidden flex flex-col">
                {/* Search query input */}
                <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-md px-2 py-1 mb-2 text-[12px]">
                  <Search size={12} className="text-white/40 shrink-0" />
                  <input
                    type="text"
                    placeholder="Filter celestial bodies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent text-white placeholder-white/40 outline-none w-full text-[12px]"
                    autoFocus
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-white/40 hover:text-white">
                      <X size={11} />
                    </button>
                  )}
                </div>

                {/* macOS Segmented Category Filter */}
                <div className="flex items-center bg-black/30 rounded-md p-0.5 border border-white/6 mb-2 text-[11px]">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`flex-1 py-0.5 rounded text-center font-medium transition-colors ${
                      filterType === 'all' ? 'bg-[#007AFF] text-white shadow-xs' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    All ({celestialBodies.length})
                  </button>
                  <button
                    onClick={() => setFilterType('planet')}
                    className={`flex-1 py-0.5 rounded text-center font-medium transition-colors ${
                      filterType === 'planet' ? 'bg-[#007AFF] text-white shadow-xs' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Planets
                  </button>
                  <button
                    onClick={() => setFilterType('moon')}
                    className={`flex-1 py-0.5 rounded text-center font-medium transition-colors ${
                      filterType === 'moon' ? 'bg-[#007AFF] text-white shadow-xs' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Moons
                  </button>
                </div>

                {/* Body Items List */}
                <div className="space-y-0.5 max-h-60 overflow-y-auto pr-0.5">
                  {filteredBodies.length === 0 ? (
                    <div className="py-3 text-center text-[12px] text-white/40">No bodies match "{searchQuery}"</div>
                  ) : (
                    filteredBodies.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          onSelectBody(b.id);
                          setIsDropdownOpen(false);
                          setSearchQuery('');
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-[12px] flex items-center justify-between transition-colors ${
                          selectedBodyId === b.id
                            ? 'bg-[#007AFF] text-white font-medium'
                            : 'text-white/80 hover:bg-white/10'
                        }`}
                      >
                        <span className="font-medium">{b.name}</span>
                        <span className="text-[10px] text-white/40">
                          {b.orbitTarget ? `Moon of ${b.orbitTarget.toUpperCase()}` : b.type.split(' ')[0]}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div />
      )}
    </header>
  );
}
