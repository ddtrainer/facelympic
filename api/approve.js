// Facelympic — Pi 결제 서버 승인
// 클라이언트가 Pi.createPayment 흐름에서 onReadyForServerApproval 시 paymentId 전달.
// 서버가 앱 Server API Key(환경변수 PI_API_KEY)로 Pi 결제를 승인.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const key = process.env.PI_API_KEY;
  if (!key) { res.status(500).json({ error: 'no_api_key' }); return; }   // Vercel 환경변수 미설정

  let paymentId = '';
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    paymentId = (b && b.paymentId) || '';
  } catch (e) {}
  if (!paymentId) { res.status(400).json({ error: 'no_payment_id' }); return; }

  try {
    const r = await fetch('https://api.minepi.com/v2/payments/' + paymentId + '/approve', {
      method: 'POST',
      headers: { Authorization: 'Key ' + key }
    });
    const j = await r.json().catch(() => ({}));
    res.status(r.ok ? 200 : r.status).json({ ok: r.ok, data: j });
  } catch (e) {
    res.status(500).json({ error: 'approve_failed', message: String((e && e.message) || e) });
  }
}
