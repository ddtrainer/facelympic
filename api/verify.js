// Facelympic — Pi 액세스 토큰 서버 검증
// 클라이언트가 Pi.authenticate 로 받은 accessToken 을 서버에서 Pi 플랫폼 /me 로 확인.
// 이 흐름은 앱 비밀 API 키가 필요 없음(사용자 토큰을 Bearer 로 전달).
// 성공 시 검증된 { uid, username } 반환.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  // 토큰: Authorization: Bearer <token>  (없으면 JSON 바디 { accessToken })
  let token = '';
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) token = auth.slice(7).trim();
  if (!token && req.body) {
    try {
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      token = (b && b.accessToken) || '';
    } catch (e) {}
  }
  if (!token) { res.status(400).json({ error: 'no_token' }); return; }

  try {
    const r = await fetch('https://api.minepi.com/v2/me', {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!r.ok) { res.status(401).json({ error: 'invalid_token', status: r.status }); return; }
    const me = await r.json();
    res.status(200).json({ ok: true, uid: me.uid, username: me.username });
  } catch (e) {
    res.status(500).json({ error: 'verify_failed', message: String((e && e.message) || e) });
  }
}
