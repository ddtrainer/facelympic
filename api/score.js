// Facelympic — server-gated score submission (anti-cheat Phase 1)
// (1) plausibility check (reject impossible times), (2) verify Pi token via /me
//     -> if verified, server sets the name to 'π <username>' + verified=true so the
//        client cannot forge the verified marker. Unverified names get any leading
//        π (U+03C0) stripped. Inserts into fl_scores.
// (Phase 1 uses the public anon key. RLS lockdown + service role = Phase 1.5.)
const SB_URL = 'https://yixigkpyncjmbfyaocjl.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpeGlna3B5bmNqbWJmeWFvY2psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTg2NjksImV4cCI6MjA5NDA3NDY2OX0.7XDv1emSYABdYDcdGa54MCLH-iAiwEPHr43HiWP_kD4';
const PI_PREFIX = String.fromCharCode(0x03c0);   // π
const EV_MIN = { sprint: 4, middle: 10, long: 20 };   // impossible-time floor (seconds)
const EV_MAX = 3600;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  let event_id = '', time_sec = null, day = '', nickname = '', accessToken = '';
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (b) { event_id = b.event_id || ''; time_sec = b.time_sec; day = b.day || ''; nickname = b.nickname || ''; accessToken = b.accessToken || ''; }
  } catch (e) {}

  // (1) plausibility
  const floor = EV_MIN[event_id];
  if (!floor || typeof time_sec !== 'number' || !isFinite(time_sec) || time_sec < floor || time_sec > EV_MAX || !day) {
    res.status(400).json({ error: 'implausible' });
    return;
  }

  // strip any leading whitespace / π (U+03C0) from an unverified name so it can't fake the marker
  let name = String(nickname || '');
  while (name.length && (name.charCodeAt(0) === 0x03c0 || name.charCodeAt(0) === 32)) name = name.slice(1);   // strip leading pi(U+03C0)/space so unverified can't fake the marker
  name = name.slice(0, 20);
  let verified = false;

  // (2) identity verification (optional): valid Pi token -> server assigns π + username
  if (accessToken) {
    try {
      const me = await fetch('https://api.minepi.com/v2/me', { headers: { Authorization: 'Bearer ' + accessToken } });
      if (me.ok) { const u = await me.json(); if (u && u.username) { verified = true; name = PI_PREFIX + ' ' + String(u.username).slice(0, 18); } }
    } catch (e) {}
  }

  try {
    const r = await fetch(SB_URL + '/rest/v1/fl_scores', {
      method: 'POST',
      headers: { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ event_id, time_sec, day, player_name: name || null, verified })
    });
    res.status(r.ok ? 200 : 500).json({ ok: r.ok, verified });
  } catch (e) {
    res.status(500).json({ error: 'insert_failed', message: String((e && e.message) || e) });
  }
}
