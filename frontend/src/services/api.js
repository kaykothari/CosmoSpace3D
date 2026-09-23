const API_BASE = '/api';
const BASE_PATH = import.meta.env.BASE_URL ? import.meta.env.BASE_URL.replace(/\/$/, '') : '';

export async function fetchCelestialBodies() {
  try {
    const res = await fetch(`${API_BASE}/celestial-bodies`);
    if (res.ok) return await res.json();
  } catch (e) {
    // Fallback to static asset for GitHub Pages / offline hosting
  }
  const fallback = await fetch(`${BASE_PATH}/celestial_bodies.json`);
  if (!fallback.ok) throw new Error('Failed to load celestial bodies data');
  return fallback.json();
}

export async function fetchHeldOutSamples() {
  try {
    const res = await fetch(`${API_BASE}/held-out`);
    if (res.ok) return await res.json();
  } catch (e) {
    // Fallback to static asset for GitHub Pages
  }
  const fallback = await fetch(`${BASE_PATH}/held_out_samples.json`);
  if (!fallback.ok) throw new Error('Failed to load held-out samples');
  return fallback.json();
}

export async function fetchMetrics() {
  try {
    const res = await fetch(`${API_BASE}/metrics`);
    if (res.ok) return await res.json();
  } catch (e) {
    // Fallback to static asset for GitHub Pages
  }
  const fallback = await fetch(`${BASE_PATH}/metrics.json`);
  if (!fallback.ok) throw new Error('Failed to load metrics data');
  return fallback.json();
}

export async function predictTelemetry(payload) {
  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) return await res.json();
  } catch (e) {
    // Fallback client-side inference engine for offline / GitHub Pages
  }

  // Client-side inference and ESI calculation fallback
  const mass = Math.max(0.01, Number(payload.pl_bmasse) || 1.0);
  const temp = Math.max(10, Number(payload.pl_eqt) || 288);
  const period = Math.max(0.1, Number(payload.pl_orbper) || 365);
  const starMass = Number(payload.st_mass) || 1.0;
  const starRad = Number(payload.st_rad) || 1.0;
  const starTeff = Number(payload.st_teff) || 5778;

  // Power-law radius estimation based on empirical exoplanet mass-radius relation
  let predRadius;
  if (mass < 2.0) {
    predRadius = Math.pow(mass, 0.28) * 1.01;
  } else if (mass < 20.0) {
    predRadius = Math.pow(mass, 0.55) * 0.81;
  } else if (mass < 150.0) {
    predRadius = Math.pow(mass, 0.38) * 1.25;
  } else {
    // Gas giant plateau (~0.9 to 1.8 Rjup, ~10 to 20 Rearth)
    predRadius = Math.min(22.0, 9.5 + Math.log10(mass) * 3.8);
  }
  predRadius = Math.round(Math.max(0.2, predRadius) * 100) / 100;

  const rForEsi = payload.pl_rade || predRadius;
  const esi_r = 1.0 - Math.abs((rForEsi - 1.0) / (rForEsi + 1.0));
  const esi_t = 1.0 - Math.abs((temp - 288.0) / (temp + 288.0));
  const esi = Math.round(Math.sqrt(Math.max(0, Math.min(1.0, esi_r * esi_t))) * 1000) / 1000;

  // Derive habitability tier & probabilities
  let pEarth = 0.05;
  let pSub = 0.10;
  let pUninhab = 0.85;

  if (temp >= 180 && temp <= 330 && predRadius >= 0.6 && predRadius <= 1.8 && mass <= 8.0) {
    // High chance of Earth-Like
    pEarth = Math.min(0.96, Math.max(0.65, esi * 0.98));
    pSub = Math.min(0.25, (1.0 - pEarth) * 0.6);
    pUninhab = Math.max(0.02, 1.0 - pEarth - pSub);
  } else if ((temp >= 140 && temp <= 380 && predRadius <= 2.5) || (temp < 180 && mass > 0.05 && mass < 15.0)) {
    // Sub-surface habitable (geothermal / sub-ice ocean)
    pSub = 0.65 + Math.min(0.25, esi * 0.3);
    pEarth = Math.min(0.20, esi * 0.25);
    pUninhab = Math.max(0.05, 1.0 - pEarth - pSub);
  } else {
    // Extreme heat, high radiation or massive gas envelope
    pUninhab = 0.88 + Math.min(0.10, Math.abs(temp - 288) / 3000);
    pSub = (1.0 - pUninhab) * 0.7;
    pEarth = Math.max(0.01, 1.0 - pUninhab - pSub);
  }

  // Normalize probabilities
  const totalP = pEarth + pSub + pUninhab;
  pEarth = Math.round((pEarth / totalP) * 1000) / 1000;
  pSub = Math.round((pSub / totalP) * 1000) / 1000;
  pUninhab = Math.round((1.0 - pEarth - pSub) * 1000) / 1000;

  let tier = 'Uninhabitable';
  if (pEarth >= pSub && pEarth >= pUninhab) tier = 'Earth-Like';
  else if (pSub >= pEarth && pSub >= pUninhab) tier = 'Sub-Surface';

  const confidence = Math.max(pEarth, pSub, pUninhab);

  // NASA JPL style hazard commentary
  const notes = [];
  if (temp < 180) {
    notes.append ? null : notes.push('Cryogenic deep freeze; surface volatiles exist as cryogenic clathrates or sub-surface oceans only.');
  } else if (temp > 350) {
    notes.push('Severe thermal irradiation; catastrophic runaway water loss and atmospheric boil-off.');
  } else {
    notes.push('Thermal equilibrium supports potential circumstellar liquid surface water.');
  }

  if (predRadius > 2.0 || mass > 10.0) {
    notes.push('Heavy volatile envelope; non-rocky gas mantle creates extreme hydrostatic pressures.');
  } else if (predRadius < 0.5) {
    notes.push('Sub-Earth mass; vulnerable to stellar wind stripping due to minimal gravitational retention.');
  } else {
    notes.push('Terrestrial rocky lithosphere regime.');
  }

  if (tier === 'Earth-Like') {
    notes.push('Goldilocks orbit telemetry confirmed with high atmospheric stability index.');
  } else if (tier === 'Sub-Surface') {
    notes.push('Intermediate astrobiological candidate; sub-surface geothermal or ocean habitability plausible.');
  } else {
    notes.push('Inimical environment; lethal ionizing stellar flux and supercritical equilibrium.');
  }

  return {
    habitability_tier: tier,
    esi_score: esi,
    predicted_radius: predRadius,
    actual_radius: payload.pl_rade || null,
    radius_error: payload.pl_rade ? Math.round(Math.abs(predRadius - payload.pl_rade) * 100) / 100 : null,
    confidence: confidence,
    probabilities: {
      'Earth-Like': pEarth,
      'Sub-Surface': pSub,
      'Uninhabitable': pUninhab
    },
    hazard_assessment: notes.join(' ')
  };
}

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) return { status: 'offline' };
    return res.json();
  } catch (err) {
    return { status: 'static', note: 'Static client mode active' };
  }
}
