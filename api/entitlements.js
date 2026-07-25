// Facelympic — 유료 구매(꾸미기 아이템) 서버 보관·복원
// 왜 필요한가: 구매 기록이 기기 localStorage에만 있으면 데이터 삭제·폰 교체 시
// 실제 Pi로 산 아이템이 영구 소실된다(환불 분쟁·신뢰 문제). Pi 계정(uid)에 묶어 서버에 보관한다.
//
// 신원은 반드시 **서버에서** Pi accessToken을 검증해 얻는다(클라가 보낸 uid는 신뢰하지 않음).
//   action 'grant' : 결제 완료된 아이템 기록(중복은 병합)
//   action 'list'  : 이 계정이 보유한 아이템 목록 반환(복원용)
const SB_URL = 'https://yixigkpyncjmbfyaocjl.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpeGlna3B5bmNqbWJmeWFvY2psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTg2NjksImV4cCI6MjA5NDA3NDY2OX0.7XDv1emSYABdYDcdGa54MCLH-iAiwEPHr43HiWP_kD4';
const TABLE = 'fl_purchases';
const KINDS = { skin: 1, theme: 1, hat: 1 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  let action = '', accessToken = '', itemId = '', kind = '', paymentId = '', txid = '';
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (b) {
      action = b.action || '';
      accessToken = b.accessToken || '';
      itemId = String(b.itemId || '').slice(0, 40);
      kind = String(b.kind || '').slice(0, 10);
      paymentId = String(b.paymentId || '').slice(0, 80);
      txid = String(b.txid || '').slice(0, 120);
    }
  } catch (e) {}

  if (!accessToken) { res.status(400).json({ error: 'no_token' }); return; }

  // ---- 신원 검증: Pi 플랫폼에 직접 물어본다(위조 불가) ----
  let uid = '';
  try {
    const me = await fetch('https://api.minepi.com/v2/me', { headers: { Authorization: 'Bearer ' + accessToken } });
    if (!me.ok) { res.status(401).json({ error: 'invalid_token' }); return; }
    const j = await me.json();
    uid = j && j.uid ? String(j.uid) : '';
  } catch (e) {
    res.status(502).json({ error: 'verify_failed' }); return;
  }
  if (!uid) { res.status(401).json({ error: 'no_uid' }); return; }

  const sbHeaders = { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON, 'Content-Type': 'application/json' };

  try {
    if (action === 'list') {
      const r = await fetch(SB_URL + '/rest/v1/' + TABLE + '?uid=eq.' + encodeURIComponent(uid) + '&select=item_id,kind', { headers: sbHeaders });
      if (!r.ok) { res.status(502).json({ error: 'db_read_failed', status: r.status }); return; }
      const rows = await r.json().catch(() => []);
      res.status(200).json({ ok: true, items: Array.isArray(rows) ? rows : [] });
      return;
    }

    if (action === 'grant') {
      if (!itemId || !KINDS[kind]) { res.status(400).json({ error: 'bad_item' }); return; }
      // 같은 계정이 같은 아이템을 다시 사도 한 줄로 병합(uid,item_id 유니크)
      const r = await fetch(SB_URL + '/rest/v1/' + TABLE + '?on_conflict=uid,item_id', {
        method: 'POST',
        headers: Object.assign({}, sbHeaders, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
        body: JSON.stringify([{ uid, item_id: itemId, kind, payment_id: paymentId || null, txid: txid || null }])
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        res.status(502).json({ error: 'db_write_failed', status: r.status, detail: txt.slice(0, 200) });
        return;
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'bad_action' });
  } catch (e) {
    res.status(500).json({ error: 'server_error', message: String((e && e.message) || e) });
  }
}
