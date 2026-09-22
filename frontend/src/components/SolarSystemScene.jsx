import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

// Texture Loader cache with fallback
const textureCache = new Map();
const textureLoader = new THREE.TextureLoader();

function getTexture(url) {
  if (!url) return null;
  if (!textureCache.has(url)) {
    const tex = textureLoader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(url, tex);
  }
  return textureCache.get(url);
}

// High-Fidelity Radial Gradient Glow Textures (Zero polygonal edges)
let _sunCoronaTex = null;
function getSunCoronaTexture() {
  if (!_sunCoronaTex && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(256, 256, 30, 256, 256, 256);
    gradient.addColorStop(0.0, 'rgba(255, 250, 220, 0.95)');
    gradient.addColorStop(0.2, 'rgba(251, 191, 36, 0.7)');
    gradient.addColorStop(0.48, 'rgba(245, 158, 11, 0.28)');
    gradient.addColorStop(0.78, 'rgba(217, 119, 6, 0.06)');
    gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    _sunCoronaTex = new THREE.CanvasTexture(canvas);
    _sunCoronaTex.colorSpace = THREE.SRGBColorSpace;
  }
  return _sunCoronaTex;
}

let _selectionGlowTex = null;
function getSelectionGlowTexture() {
  if (!_selectionGlowTex && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(256, 256, 60, 256, 256, 256);
    gradient.addColorStop(0.0, 'rgba(56, 189, 248, 0.9)');
    gradient.addColorStop(0.28, 'rgba(0, 122, 255, 0.6)');
    gradient.addColorStop(0.62, 'rgba(0, 122, 255, 0.2)');
    gradient.addColorStop(0.85, 'rgba(2, 132, 199, 0.05)');
    gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    _selectionGlowTex = new THREE.CanvasTexture(canvas);
    _selectionGlowTex.colorSpace = THREE.SRGBColorSpace;
  }
  return _selectionGlowTex;
}

// Asteroid / Meteor Field using InstancedMesh
function AsteroidBelt({ innerRadius, outerRadius, count, color = '#64748b', speed = 0.005 }) {
  const meshRef = useRef();

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const asteroidData = useMemo(() => {
    const data = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
      const y = (Math.random() - 0.5) * 1.5;
      const scale = 0.04 + Math.random() * 0.09;
      data.push({ angle, radius, y, scale });
    }
    return data;
  }, [innerRadius, outerRadius, count]);

  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < count; i++) {
      const { angle, radius, y, scale } = asteroidData[i];
      dummy.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      dummy.scale.set(scale, scale * (0.8 + Math.random() * 0.4), scale);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [asteroidData, count, dummy]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += speed * delta;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]} raycast={() => null}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={color} roughness={0.85} metalness={0.15} />
    </instancedMesh>
  );
}

// Clean Circular Orbit Line Loop
function OrbitRing({ radius, isSelected, isMoon = false }) {
  const points = useMemo(() => {
    const pts = [];
    const segments = isMoon ? 128 : 256;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
    }
    return pts;
  }, [radius, isMoon]);

  const lineGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  return (
    <lineLoop geometry={lineGeometry} raycast={() => null}>
      <lineBasicMaterial
        color={isSelected ? '#007AFF' : isMoon ? '#38bdf8' : '#64748b'}
        transparent
        opacity={isSelected ? 0.95 : isMoon ? 0.65 : 0.65}
        linewidth={isSelected ? 2 : 1}
      />
    </lineLoop>
  );
}

// Axial Tilt Indicator Line (Only visible when focused)
function RotationAxis({ size }) {
  const linePoints = useMemo(() => {
    const len = size * 1.8;
    return [new THREE.Vector3(0, -len, 0), new THREE.Vector3(0, len, 0)];
  }, [size]);

  const geom = useMemo(() => new THREE.BufferGeometry().setFromPoints(linePoints), [linePoints]);

  return (
    <group raycast={() => null}>
      <line geometry={geom}>
        <lineBasicMaterial color="#38bdf8" transparent opacity={0.85} linewidth={2} />
      </line>
      <mesh position={[0, size * 1.8, 0]}>
        <sphereGeometry args={[size * 0.07, 16, 16]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
      <mesh position={[0, -size * 1.8, 0]}>
        <sphereGeometry args={[size * 0.07, 16, 16]} />
        <meshBasicMaterial color="#60a5fa" />
      </mesh>
    </group>
  );
}

// Interactive Space Backdrop to reliably detect clicking in open space
function SpaceBackdrop({ onDeselect }) {
  const pointerDownPos = useRef({ x: 0, y: 0 });

  return (
    <mesh
      onPointerDown={(e) => {
        pointerDownPos.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const dx = e.clientX - pointerDownPos.current.x;
        const dy = e.clientY - pointerDownPos.current.y;
        if (Math.hypot(dx, dy) < 6) {
          onDeselect();
        }
      }}
    >
      <sphereGeometry args={[1800, 16, 16]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.BackSide} />
    </mesh>
  );
}

// Gradiented Selection Glow: Seamless continuous radial gradient aura with gentle breathing pulse
function SelectionGlow({ size, isSun = false }) {
  const spriteRef = useRef();
  const glowTexture = useMemo(() => getSelectionGlowTexture(), []);

  useFrame((state) => {
    if (spriteRef.current) {
      const pulse = 1.0 + Math.sin(state.clock.elapsedTime * 2.8) * 0.035;
      const baseScale = size * 3.2;
      spriteRef.current.scale.set(baseScale * pulse, baseScale * pulse, 1);
    }
  });

  if (isSun || !glowTexture) return null;

  return (
    <sprite ref={spriteRef} scale={[size * 3.2, size * 3.2, 1]} raycast={() => null}>
      <spriteMaterial
        map={glowTexture}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        opacity={0.88}
      />
    </sprite>
  );
}

// Celestial Body 3D Mesh
function CelestialBodyMesh({
  body,
  isSelected,
  focusedParentId,
  moons = [],
  onSelect,
  simulationSpeed,
  isPaused,
  bodyPositionsRef,
  registerBodyPosition
}) {
  const groupRef = useRef();
  const sphereRef = useRef();
  const ringRef = useRef();
  const orbitAngleRef = useRef(Math.random() * Math.PI * 2);

  const texture = useMemo(() => getTexture(body.textureUrl), [body.textureUrl]);
  const bumpTexture = useMemo(() => getTexture(body.bumpUrl), [body.bumpUrl]);
  const ringTexture = useMemo(() => getTexture(body.ringTextureUrl), [body.ringTextureUrl]);
  const isSun = body.id === 'sun';
  const sunCorona = useMemo(() => (isSun ? getSunCoronaTexture() : null), [isSun]);

  // Realistic radial UV mapping for planetary rings
  const ringGeometry = useMemo(() => {
    if (!body.hasRings) return null;
    const innerRadius = body.ringInnerRadius || 2.1;
    const outerRadius = body.ringOuterRadius || 4.4;
    const geo = new THREE.RingGeometry(innerRadius, outerRadius, 160, 8);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const v3 = new THREE.Vector3();
    const span = outerRadius - innerRadius;

    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i);
      uv.setXY(i, (v3.length() - innerRadius) / span, 0.5);
    }
    uv.needsUpdate = true;
    return geo;
  }, [body.hasRings, body.ringInnerRadius, body.ringOuterRadius]);

  // Astronomically calibrated relative rotation speeds anchored to a cinematic 60s Earth day
  const spinRate = useMemo(() => {
    // 1 Earth Day = 60s (0.105 rad/s)
    if (body.id === 'earth') return 0.105;
    // Mars: 24.6h day (~identical to Earth)
    if (body.id === 'mars') return 0.102;
    // Jupiter: 9.9h day (2.4x faster than Earth)
    if (body.id === 'jupiter') return 0.254;
    // Saturn: 10.7h day (2.24x faster than Earth)
    if (body.id === 'saturn') return 0.235;
    // Uranus: 17.2h day (retrograde)
    if (body.id === 'uranus') return -0.146;
    // Neptune: 16.1h day
    if (body.id === 'neptune') return 0.156;
    // Mercury: 58.6 Earth days (very slow)
    if (body.id === 'mercury') return 0.025;
    // Venus: 243 Earth days (extremely slow retrograde)
    if (body.id === 'venus') return -0.015;
    // Sun: ~27 days rotation
    if (body.id === 'sun') return 0.035;
    // Moons: gentle tidal pace
    return 0.08;
  }, [body.id]);

  useFrame((state, delta) => {
    // 1. VISIBLE AXIAL ROTATION ON INNER SPHERE
    if (sphereRef.current && !isPaused) {
      sphereRef.current.rotation.y += spinRate * delta * simulationSpeed;
    }

    // 2. Orbital Revolution
    if (!isPaused && body.orbitSpeed !== 0) {
      orbitAngleRef.current += body.orbitSpeed * delta * simulationSpeed * 0.35;
    }

    // 3. Position Calculation
    if (body.id === 'sun') {
      if (groupRef.current) groupRef.current.position.set(0, 0, 0);
      registerBodyPosition('sun', new THREE.Vector3(0, 0, 0));
    } else if (body.orbitTarget) {
      const parentPos = bodyPositionsRef.current[body.orbitTarget];
      if (parentPos && groupRef.current) {
        const x = parentPos.x + Math.cos(orbitAngleRef.current) * body.orbitRadius;
        const z = parentPos.z + Math.sin(orbitAngleRef.current) * body.orbitRadius;
        groupRef.current.position.set(x, parentPos.y, z);
        registerBodyPosition(body.id, groupRef.current.position);
      }
    } else {
      const x = Math.cos(orbitAngleRef.current) * body.orbitRadius;
      const z = Math.sin(orbitAngleRef.current) * body.orbitRadius;
      if (groupRef.current) {
        groupRef.current.position.set(x, 0, z);
        registerBodyPosition(body.id, groupRef.current.position);
      }
    }
  });

  const tiltRad = ((body.axialTilt || 0) * Math.PI) / 180;
  const isParentInFocus = focusedParentId === body.id;

  return (
    <group ref={groupRef}>
      <group
        onClick={(e) => {
          e.stopPropagation();
          // If already selected, clicking it again unfocuses; otherwise focus it
          if (isSelected) {
            onSelect(null);
          } else {
            onSelect(body.id);
          }
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        {/* Invisible enlarged hit target: ONLY active when NOT selected so space around focused world is 100% click-through */}
        {!isSelected && (
          <mesh>
            <sphereGeometry args={[Math.max(body.size * 1.6, 0.45), 16, 16]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        )}

        <group rotation={[0, 0, tiltRad]}>
          <mesh ref={sphereRef}>
            <sphereGeometry args={[body.size, 64, 64]} />
            {isSun ? (
              <meshStandardMaterial
                map={texture}
                color="#ffeedd"
                emissive="#f59e0b"
                emissiveIntensity={3.6}
                roughness={0.1}
              />
            ) : (
              <meshStandardMaterial
                map={texture}
                bumpMap={bumpTexture}
                bumpScale={0.035}
                color={texture ? '#ffffff' : body.color}
                roughness={0.4}
                metalness={0.06}
              />
            )}
          </mesh>

          {/* Saturn Rings with Realistic Radial UV Mapping & Cassini Division Transparency */}
          {body.hasRings && ringGeometry && (
            <mesh ref={ringRef} geometry={ringGeometry} rotation={[Math.PI / 2, 0, 0]}>
              <meshStandardMaterial
                map={ringTexture}
                color="#ffffff"
                side={THREE.DoubleSide}
                transparent={true}
                opacity={0.98}
                roughness={0.5}
                metalness={0.04}
                alphaTest={0.01}
              />
            </mesh>
          )}

          {/* Rotation Axis: Visible only when this planet is in focus */}
          {isSelected && !isSun && <RotationAxis size={body.size} />}
        </group>

        {/* Selected Highlight Atmospheric Glow (Replaces flat ring reticle) */}
        {isSelected && <SelectionGlow size={body.size} isSun={isSun} />}

        {/* Radiant Sun Corona Glow (Seamless Radial Gradient Billboard Sprite - Replaces the 2 hard spheres) */}
        {isSun && sunCorona && (
          <sprite scale={[body.size * 3.8, body.size * 3.8, 1]} raycast={() => null}>
            <spriteMaterial
              map={sunCorona}
              transparent
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              opacity={0.86}
            />
          </sprite>
        )}
      </group>

      {/* Moon Orbits: Visible only when parent planet is focused */}
      {isParentInFocus &&
        moons.map((moon) => (
          <OrbitRing
            key={`moon-orbit-${moon.id}`}
            radius={moon.orbitRadius}
            isSelected={false}
            isMoon={true}
          />
        ))}
    </group>
  );
}

// Camera Tracker: Cinematic Apple Fly-To smooth transition & orbital tracking
function CameraManager({ selectedBodyId, celestialBodies = [], bodyPositionsRef, controlsRef, resetTrigger }) {
  const { camera } = useThree();
  const defaultPos = useMemo(() => new THREE.Vector3(0, 85, 120), []);
  const defaultTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  // Transit state refs
  const isResettingRef = useRef(false);
  const isTransitingRef = useRef(false);
  const transitTimeRef = useRef(0);
  const transitDurationRef = useRef(1.35); // 1.35s cinematic flight

  const startCamPosRef = useRef(new THREE.Vector3());
  const startTargetPosRef = useRef(new THREE.Vector3());
  const flightDirRef = useRef(new THREE.Vector3());
  const prevTargetPosRef = useRef(new THREE.Vector3());
  const prevSelectedIdRef = useRef(null);

  // Smooth easeInOutCubic function for cinematic motion
  const easeInOutCubic = (x) => {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };

  // Trigger smooth reset to overview
  const initiateReset = () => {
    if (!controlsRef.current) return;
    isResettingRef.current = true;
    isTransitingRef.current = false;
    transitTimeRef.current = 0;
    transitDurationRef.current = 1.2;
    startCamPosRef.current.copy(camera.position);
    startTargetPosRef.current.copy(controlsRef.current.target);
  };

  useEffect(() => {
    if (resetTrigger > 0) {
      initiateReset();
    }
  }, [resetTrigger]);

  useEffect(() => {
    if (selectedBodyId) {
      if (controlsRef.current) {
        startCamPosRef.current.copy(camera.position);
        startTargetPosRef.current.copy(controlsRef.current.target);

        // Compute stable viewing angle: retain current azimuth while enforcing gentle elevation
        const dir = camera.position.clone().sub(controlsRef.current.target);
        if (dir.lengthSq() < 0.01) {
          flightDirRef.current.set(0, 0.45, 0.89).normalize();
        } else {
          dir.normalize();
          // Ensure a pleasant camera elevation angle (avoid looking completely flat or strictly top-down)
          dir.y = Math.max(0.32, Math.min(dir.y, 0.75));
          dir.normalize();
          flightDirRef.current.copy(dir);
        }
      }
      isTransitingRef.current = true;
      isResettingRef.current = false;
      transitTimeRef.current = 0;
      transitDurationRef.current = 1.35;
    } else if (prevSelectedIdRef.current !== null) {
      initiateReset();
    }
    prevSelectedIdRef.current = selectedBodyId;
  }, [selectedBodyId]);

  useFrame((state, delta) => {
    if (!controlsRef.current) return;

    // 1. Cinematic Reset Animation (Back to solar system overview)
    if (isResettingRef.current) {
      transitTimeRef.current += delta;
      const progress = Math.min(1.0, transitTimeRef.current / transitDurationRef.current);
      const ease = easeInOutCubic(progress);

      camera.position.lerpVectors(startCamPosRef.current, defaultPos, ease);
      controlsRef.current.target.lerpVectors(startTargetPosRef.current, defaultTarget, ease);

      if (progress >= 1.0) {
        camera.position.copy(defaultPos);
        controlsRef.current.target.copy(defaultTarget);
        isResettingRef.current = false;
      }
      controlsRef.current.update();
      return;
    }

    // 2. Overview Mode: Camera free to orbit
    if (!selectedBodyId) {
      return;
    }

    // 3. Planet / Moon is selected
    const targetPos = bodyPositionsRef.current[selectedBodyId];
    if (!targetPos) return;

    // Optimal zoom distance tailored to body scale
    let targetDist = 4.2;
    if (selectedBodyId === 'sun') {
      targetDist = 14.0;
    } else if (selectedBodyId === 'jupiter') {
      targetDist = 7.0;
    } else if (selectedBodyId === 'saturn') {
      targetDist = 8.5;
    } else {
      const selected = celestialBodies.find((b) => b.id === selectedBodyId);
      if (selected && selected.orbitTarget) {
        targetDist = Math.max(selected.size * 6.0, 1.8);
      } else if (selected) {
        targetDist = Math.max(selected.size * 4.0, 3.5);
      }
    }

    if (isTransitingRef.current) {
      transitTimeRef.current += delta;
      const progress = Math.min(1.0, transitTimeRef.current / transitDurationRef.current);
      const ease = easeInOutCubic(progress);

      // Desired camera position in orbit of the moving body
      const destCamPos = targetPos.clone().add(flightDirRef.current.clone().multiplyScalar(targetDist));

      // Seamlessly glide both target and camera
      controlsRef.current.target.lerpVectors(startTargetPosRef.current, targetPos, ease);
      camera.position.lerpVectors(startCamPosRef.current, destCamPos, ease);

      if (progress >= 1.0) {
        // Handover to orbital tracking: zero positional or velocity discontinuity
        isTransitingRef.current = false;
        controlsRef.current.target.copy(targetPos);
        camera.position.copy(destCamPos);
        prevTargetPosRef.current.copy(targetPos);
      }
    } else {
      // In-orbit continuous lock tracking
      const targetDelta = targetPos.clone().sub(prevTargetPosRef.current);
      prevTargetPosRef.current.copy(targetPos);

      controlsRef.current.target.add(targetDelta);
      camera.position.add(targetDelta);
    }

    controlsRef.current.update();
  });

  return null;
}

export default function SolarSystemScene({
  celestialBodies = [],
  selectedBodyId,
  onSelectBody,
  simulationSpeed = 1,
  isPaused = false,
  resetTrigger = 0
}) {
  const controlsRef = useRef();
  const bodyPositionsRef = useRef({});

  const registerBodyPosition = (id, pos) => {
    bodyPositionsRef.current[id] = pos.clone();
  };

  const focusedParentId = useMemo(() => {
    if (!selectedBodyId) return null;
    const selected = celestialBodies.find((b) => b.id === selectedBodyId);
    if (!selected) return null;
    if (selected.orbitTarget) return selected.orbitTarget;
    return selected.id;
  }, [selectedBodyId, celestialBodies]);

  const moonsByParent = useMemo(() => {
    const map = {};
    celestialBodies.forEach((b) => {
      if (b.orbitTarget) {
        if (!map[b.orbitTarget]) map[b.orbitTarget] = [];
        map[b.orbitTarget].push(b);
      }
    });
    return map;
  }, [celestialBodies]);

  return (
    <div className="w-full h-full relative bg-[#050608]">
      <Canvas
        camera={{ position: [0, 85, 120], fov: 45, near: 0.1, far: 2500 }}
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={() => onSelectBody(null)}
      >
        <color attach="background" args={['#050608']} />

        {/* Ambient Space Light */}
        <ambientLight intensity={0.65} color="#e2e8f0" />

        {/* Celestial Sky Bounce */}
        <hemisphereLight skyColor="#93c5fd" groundColor="#0f172a" intensity={0.4} />

        {/* Brilliant Warm Sunlight across the Solar System */}
        <pointLight position={[0, 0, 0]} intensity={650} distance={600} decay={1.2} color="#fff8e7" />
        <pointLight position={[0, 0, 0]} intensity={200} distance={800} decay={0.8} color="#fde047" />

        {/* Expansive Deep Space Starfield */}
        <Stars radius={400} depth={120} count={6500} factor={4} saturation={0} fade speed={0.4} />

        {/* Meteor & Asteroid Fields */}
        {/* Main Asteroid Belt (Between Mars 26.0 and Jupiter 52.0) */}
        <AsteroidBelt innerRadius={31.0} outerRadius={38.0} count={1400} color="#78716c" speed={0.007} />
        {/* Kuiper Belt (Beyond Neptune 152.0 and Pluto 182.0) */}
        <AsteroidBelt innerRadius={190.0} outerRadius={230.0} count={1000} color="#94a3b8" speed={0.002} />

        {/* Primary Planetary Orbit Path Rings */}
        {celestialBodies
          .filter((b) => b.orbitRadius > 0 && !b.orbitTarget)
          .map((b) => (
            <OrbitRing
              key={`orbit-${b.id}`}
              radius={b.orbitRadius}
              isSelected={selectedBodyId === b.id}
            />
          ))}

        {/* High-Polygon Celestial Bodies (Planets & Moons) */}
        {celestialBodies.map((body) => (
          <CelestialBodyMesh
            key={body.id}
            body={body}
            isSelected={selectedBodyId === body.id}
            focusedParentId={focusedParentId}
            moons={moonsByParent[body.id] || []}
            onSelect={onSelectBody}
            simulationSpeed={simulationSpeed}
            isPaused={isPaused}
            bodyPositionsRef={bodyPositionsRef}
            registerBodyPosition={registerBodyPosition}
          />
        ))}

        {/* Smooth OrbitControls with Expansive Solar System Bounds */}
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.06}
          minDistance={1.2}
          maxDistance={550}
          maxPolarAngle={Math.PI / 2 + 0.05}
        />

        {/* Interactive Space Backdrop: Clicking anywhere in empty space resets to default overview */}
        <SpaceBackdrop onDeselect={() => onSelectBody(null)} />

        <CameraManager
          selectedBodyId={selectedBodyId}
          celestialBodies={celestialBodies}
          bodyPositionsRef={bodyPositionsRef}
          controlsRef={controlsRef}
          resetTrigger={resetTrigger}
        />
      </Canvas>
    </div>
  );
}
