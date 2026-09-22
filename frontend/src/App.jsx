import React, { useState, useEffect } from 'react';
import TelemetryHeader from './components/TelemetryHeader';
import SolarSystemScene from './components/SolarSystemScene';
import InspectorPanel from './components/InspectorPanel';
import SimulationControls from './components/SimulationControls';
import DateTimeDock from './components/DateTimeDock';
import ModelValidationView from './components/ModelValidationView';
import { fetchCelestialBodies } from './services/api';

export default function App() {
  const [activeView, setActiveView] = useState('orbit'); // 'orbit' | 'validation'
  const [celestialBodies, setCelestialBodies] = useState([]);
  const [selectedBodyId, setSelectedBodyId] = useState(null);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [simulatedDate, setSimulatedDate] = useState(() => new Date());

  useEffect(() => {
    async function init() {
      try {
        const data = await fetchCelestialBodies();
        setCelestialBodies(data);
      } catch (err) {
        console.error('Failed to load celestial bodies:', err);
      }
    }
    init();
  }, []);

  // Clock progression loop: 60 real seconds = 1 Earth day (86400s) => 1440 simulated seconds per real second at 1x
  useEffect(() => {
    let lastTime = performance.now();
    let animId;

    const tick = (now) => {
      const deltaSeconds = (now - lastTime) / 1000;
      lastTime = now;

      if (!isPaused && deltaSeconds > 0 && deltaSeconds < 1) {
        const simDeltaMs = deltaSeconds * simulationSpeed * 1440 * 1000;
        setSimulatedDate((prev) => new Date(prev.getTime() + simDeltaMs));
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPaused, simulationSpeed]);

  // Spacebar keyboard listener to toggle simulation pause
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleResetCamera = () => {
    setSelectedBodyId(null);
    setResetTrigger((prev) => prev + 1);
  };

  const selectedBody = celestialBodies.find((b) => b.id === selectedBodyId);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050608] antialiased select-none">
      {/* Apple Maps Top Navigation */}
      <TelemetryHeader
        activeView={activeView}
        setActiveView={setActiveView}
        selectedBodyId={selectedBodyId}
        onSelectBody={(id) => setSelectedBodyId(id)}
        celestialBodies={celestialBodies}
      />

      {/* Main Viewport */}
      {activeView === 'orbit' ? (
        <main className="w-full h-full relative">
          <SolarSystemScene
            celestialBodies={celestialBodies}
            selectedBodyId={selectedBodyId}
            onSelectBody={(id) => setSelectedBodyId(id)}
            simulationSpeed={simulationSpeed}
            isPaused={isPaused}
            resetTrigger={resetTrigger}
            simulatedDate={simulatedDate}
          />

          {/* macOS Sequoia Date & Time Dock (Left) */}
          <DateTimeDock
            simulatedDate={simulatedDate}
            setSimulatedDate={setSimulatedDate}
            simulationSpeed={simulationSpeed}
            isPaused={isPaused}
          />

          {/* Apple Maps Bottom Floating Playback Controls (Right) */}
          <SimulationControls
            isPaused={isPaused}
            setIsPaused={setIsPaused}
            simulationSpeed={simulationSpeed}
            setSimulationSpeed={setSimulationSpeed}
            onResetCamera={handleResetCamera}
          />

          {/* Apple Maps Place Card Inspector */}
          {selectedBody && (
            <InspectorPanel
              body={selectedBody}
              onClose={() => setSelectedBodyId(null)}
            />
          )}
        </main>
      ) : (
        <main className="w-full h-full">
          <ModelValidationView />
        </main>
      )}
    </div>
  );
}
