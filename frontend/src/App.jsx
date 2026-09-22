import React, { useState, useEffect } from 'react';
import TelemetryHeader from './components/TelemetryHeader';
import SolarSystemScene from './components/SolarSystemScene';
import InspectorPanel from './components/InspectorPanel';
import SimulationControls from './components/SimulationControls';
import ModelValidationView from './components/ModelValidationView';
import { fetchCelestialBodies } from './services/api';

export default function App() {
  const [activeView, setActiveView] = useState('orbit'); // 'orbit' | 'validation'
  const [celestialBodies, setCelestialBodies] = useState([]);
  const [selectedBodyId, setSelectedBodyId] = useState(null);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);

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
          />

          {/* Apple Maps Bottom Floating Playback Controls */}
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
