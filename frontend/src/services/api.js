const API_BASE = '/api';

export async function fetchCelestialBodies() {
  try {
    const res = await fetch(`${API_BASE}/celestial-bodies`);
    if (res.ok) return await res.json();
  } catch (e) {
    // Fallback to static asset for GitHub Pages / offline hosting
  }
  const fallback = await fetch('/celestial_bodies.json');
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
  const fallback = await fetch('/held_out_samples.json');
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
  const fallback = await fetch('/metrics.json');
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
    // Fallback client-side inference engine for GitHub Pages
  }

  // Client-side ESI and ML approximation fallback
  const r = payload.pl_rade || Math.max(0.2, Math.pow(payload.pl_bmasse, 0.28));
  const t = payload.pl_eqt;
  const esi_r = 1.0 - Math.abs((r - 1.0) / (r + 1.0));
  const esi_t = 1.0 - Math.abs((t - 288.0) / (t + 288.0));
  const esi = Math.round(Math.sqrt(Math.max(0, esi_r * esi_t)) * 1000) / 1000;

  let tier = 'Uninhabitable';
  if (esi >= 0.70) tier = 'Earth-Like';
  else if (esi >= 0.35) tier = 'Sub-Surface';

  const predRadius = Math.round(Math.pow(payload.pl_bmasse, 0.29) * 1.02 * 100) / 100;

  return {
    habitability_tier: tier,
    esi_score: esi,
    predicted_radius: predRadius,
    actual_radius: payload.pl_rade,
    radius_error: payload.pl_rade ? Math.round(Math.abs(predRadius - payload.pl_rade) * 100) / 100 : null
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
