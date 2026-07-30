// Facelympic — 익명 사용 지표 수집(퍼널·리텐션)
// 목적: "어디서 이탈하는가"를 추측이 아니라 데이터로 보기 위함. 코어팀 피칭 자료로도 사용.
//
// 개인정보 원칙:
//  - 얼굴/영상 데이터는 절대 전송하지 않음(기기 내 처리 유지).
//  - 이름·이메일·Pi 계정 등 식별정보를 저장하지 않음.
//  - aid = 기기에서 만든 무작위 익명 ID(중복 제거·리텐션 계산 전용). '내 데이터 삭제' 시 함께 사라짐.
//
// 테이블은 RLS로 잠그고 service key로만 기록한다(공개 anon 키로 위조·열람 불가).
const SB_URL = 'https://yixigkpyncjmbfyaocjl.supabase.co';
const TABLE = 'fl_events';
// 허용된 이벤트만 기록(임의 문자열 유입 차단)
const ALLOWED = new Set([
  'land',        // 앱 도착 (meta.c=1 이면 도전장 링크로 유입)
  'consent_ok',  // 동의 완료
  'cam_ok',      // 카메라 허용 성공
  'cam_fail',    // 카메라 실패 (meta.e = 오류 이름)
  'warmup_done', // 워밍업 완료
  'warmup_skip', // 워밍업 건너뛰기
  'race_start',  // 경기 시작
  'race_done',   // 완주 (meta.ev 종목, meta.t 기록)
  'pi_login',    // Pi 로그인 검증됨
  'buy',         // Pi 결제 완료
  'share',       // 도전장 공유 시도
  'pibar_show',  // Pi 커뮤니티 유입(?pi=1) — 'Pi Browser로 열기' 바 노출
  'pibar_skip',  // 그 바를 건너뛰고 현재 브라우저에서 계속
]);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SB_KEY) { res.status(500).json({ error: 'no_service_key' }); return; }

  let aid = '', ev = '', day = '', meta = null, lang = '', pi = 0;
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (b) {
      aid = String(b.aid || '').slice(0, 40);
      ev = String(b.ev || '').slice(0, 24);
      day = String(b.day || '').slice(0, 12);
      lang = String(b.lang || '').slice(0, 5);
      pi = b.pi ? 1 : 0;
      if (b.meta && typeof b.meta === 'object') {
        // 작은 값만 통과(임의 데이터 적재 방지)
        const m = {};
        for (const k of Object.keys(b.meta).slice(0, 6)) {
          const v = b.meta[k];
          if (typeof v === 'number' || typeof v === 'boolean') m[String(k).slice(0, 12)] = v;
          else if (typeof v === 'string') m[String(k).slice(0, 12)] = v.slice(0, 24);
        }
        meta = Object.keys(m).length ? m : null;
      }
    }
  } catch (e) {}

  if (!aid || !ALLOWED.has(ev) || !day) { res.status(400).json({ error: 'bad_event' }); return; }

  try {
    const r = await fetch(SB_URL + '/rest/v1/' + TABLE, {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY,
                 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify([{ aid, ev, day, meta, lang, pi }])
    });
    if (!r.ok) { const t = await r.text().catch(() => ''); res.status(502).json({ error: 'db_write_failed', detail: t.slice(0, 200) }); return; }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
}
