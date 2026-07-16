// Facelympic — 서버 경유 점수 제출 (안티치트 Phase 1)
// ① 시간 타당성 검사(불가능한 기록 거부) ② Pi 토큰 검증(/me)으로 신원 확인 →
//    검증되면 서버가 'π <유저명>' + verified=true 로 기록(클라가 π/검증 위조 불가).
// (Phase 1은 공개 anon 키로 삽입. RLS 잠금 + 서비스롤은 Phase 1.5에서 — 직접 우회 완전 차단용.)
const SB_URL = 'https://yixigkpyncjmbfyaocjl.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpeGlna3B5bmNqbWJmeWFvY2psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTg2NjksImV4cCI6MjA5NDA3NDY2OX0.7XDv1emSYABdYDcdGa54MCLH-iAiwEPHr43HiWP_kD4';
const EV_MIN = { sprint: 4, middle: 10, long: 20 };   // 물리적으로 불가능한 시간 하한(초)
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

  // ① 타당성 검사
  const floor = EV_MIN[event_id];
  if (!floor || typeof time_sec !== 'number' || !isFinite(time_sec) || time_sec < floor || time_sec > EV_MAX || !day) {
    res.status(400).json({ error: 'implausible' });   // 불가능/이상한 기록 거부
    return;
  }

  // ② 신원 검증(선택): 유효한 Pi 토큰이면 서버가 π+유저명 부여
  let verified = false;
  let name = String(nickname || '').replace(/^π\s*/, '').slice(0, 20);   // 미검증은 앞 π 제거(위조 방지)
  if (accessToken) {
    try {
      const me = await fetch('https://api.minepi.com/v2/me', { headers: { Authorization: 'Bearer ' + accessToken } });
      if (me.ok) { const u = await me.json(); if (u && u.username) { verified = true; name = 'π ' + String(u.username).slice(0, 18); } }
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
