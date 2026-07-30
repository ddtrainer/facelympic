// Facelympic — 기록 제출 + 순위표 조회
//
// 이 파일이 DB에 닿는 유일한 통로다. 예전에는 클라이언트가 공개 anon 키로 fl_scores를
// 직접 읽고 썼는데, 그러면 누구나 0.1초짜리 기록을 꽂아 넣을 수 있어 이름이 붙은 순위표가
// 첫날에 죽는다. 그래서 쓰기·읽기를 모두 서버(service key)로 옮겼다.
//
// 개인정보 원칙:
//  - 이름은 사용자가 넣은 닉네임만. Pi 사용자명은 **서버가 토큰을 검증했을 때만** 붙인다
//    (클라이언트가 "나 인증됨"이라고 주장하는 건 믿지 않는다).
//  - aid(익명 기기 ID)는 선수당 최고기록 1개만 남기는 데만 쓰고 **응답에 담지 않는다**.
//
// 부정 기록: 기록은 클라이언트가 재므로 완벽한 차단은 불가능하다. 현실적인 선까지만 —
//  ①물리적으로 불가능한 값 거부 ②주당 제출 수 제한 ③Pi 인증 배지로 '진짜 기록'을 구분.
const SB_URL = 'https://yixigkpyncjmbfyaocjl.supabase.co';
const TABLE = 'fl_scores';

// 종목별 하한(초) — 이보다 빠른 기록은 게임이 만들어낼 수 없으므로 위조로 본다.
//
// 유도: 미션에 성공하면 **즉시 전진 보너스**(resolve()의 fwd)가 붙어 실제로 달릴 거리가 줄어든다.
//   단거리 200m: 전진 50.0m → 달릴 거리 150m
//   최고속 MAXSP=19, 피버 ×1.25 → 23.75m/s가 절대 상한
//   ⇒ 이론상 최소 = 150 ÷ 23.75 = 6.32초 (피버가 내내 켜져 있다고 가정 — 실제로는 불가능)
//   같은 계산: 중거리 18.14초 · 장거리 38.12초. 실측 최고는 단 8.22초.
//
// ⚠️ 하한을 이론값에 붙이지 않는다. 순위표에서는 가짜 하나를 통과시키는 것보다
//    **아주 잘 뛴 진짜 기록을 삼키는 쪽이 훨씬 나쁘다.** 이론값의 약 0.8배까지 낮춰
//    0.1초·1초 같은 명백한 위조만 걸러낸다(현실적인 공격은 그런 형태다).
// ⚠️ EVENTS의 dist/foodBoost/mix, MAXSP, FEVER_MUL을 바꾸면 이 값도 다시 계산할 것.
const FLOOR = { sprint: 5.0, middle: 14.0, long: 30.0 };
const CEIL = 3600;
const MAX_PER_WEEK = 80;          // 정상 플레이로는 닿지 않는 수(완주자당 평균 5.4판)

const clean = (s, n) => String(s == null ? '' : s).replace(/[<>"'\\]/g, '').trim().slice(0, n);

// ISO 주차(2026-W31). 클라이언트 시계를 믿지 않고 서버가 정한다.
function weekKey(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return t.getUTCFullYear() + '-W' + String(Math.ceil(((t - y0) / 86400000 + 1) / 7)).padStart(2, '0');
}

// 선수당 최고기록 1개만 남긴다(한 사람이 순위표를 도배하지 않도록).
//
// 원칙: **화면에 보이는 이름 하나당 한 줄.** 이름이 같은데 두 줄로 나오면 고장으로 보인다.
//   같은 사람이 Pi 로그인 전후로 기록을 올리면 한쪽은 pi_name, 다른 쪽은 player_name에만
//   이름이 남는다. 기기 ID로 묶으려 해도 aid 컬럼이 생기기 전 기록은 그 값이 비어 있다.
//   → 이름을 먼저 보고, 이름이 없을 때만 기기 ID로 묶는다.
// ⚠️ 대가: 서로 다른 사람이 같은 닉네임을 쓰면 한 줄로 합쳐진다. 구분이 필요하면
//   Pi 로그인(π 배지)이 그 역할을 한다. 익명끼리는 남남일 수 있으므로 묶지 않는다.
function bestPerPlayer(rows) {
  const out = [], seen = new Map();
  for (const x of rows) {
    const nm = (x.pi_name || x.player_name || '').trim().toLowerCase();
    const key = nm ? 'n:' + nm : (x.aid ? 'a:' + x.aid : null);
    if (key && seen.has(key)) {
      // 이미 더 빠른 기록이 있다. 다만 π 배지·국가가 느린 쪽에만 있을 수 있으므로 살려서 옮긴다
      // (예전 기록은 국가 컬럼이 생기기 전이라 비어 있다).
      const kept = seen.get(key);
      if (!kept.pi_name && x.pi_name) kept.pi_name = x.pi_name;
      if (!kept.country && x.country) kept.country = x.country;
      continue;
    }
    if (key) seen.set(key, x);
    out.push(x);
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SB_KEY) { res.status(500).json({ error: 'no_service_key' }); return; }
  const H = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' };
  const wk = weekKey(new Date());

  // ---------------- 순위표 조회 ----------------
  if (req.method === 'GET') {
    const q = req.query || {};
    const ev = clean(q.ev || 'sprint', 12);
    const aid = clean(q.aid || '', 40);          // 내 순위 표시용 — 응답엔 담기지 않는다
    const day = clean(q.day || '', 12);
    // 기본은 **누적**. 주간 리셋을 기본으로 두면 월요일마다 빈 순위표로 돌아가,
    // 아직 선수가 적은 지금은 기록이 쌓이는 맛이 사라진다. 주간은 탭으로 남긴다.
    const scope = clean(q.scope || (day ? 'day' : 'all'), 6);
    if (!FLOOR[ev]) { res.status(400).json({ error: 'bad_event' }); return; }
    try {
      const filter = scope === 'day'  ? '&day=eq.' + encodeURIComponent(day || '')
                   : scope === 'week' ? '&wk=eq.' + encodeURIComponent(wk)
                   : '';
      const url = SB_URL + '/rest/v1/' + TABLE
        + '?select=aid,player_name,pi_name,country,time_sec&event_id=eq.' + encodeURIComponent(ev)
        + filter + '&order=time_sec.asc&limit=2000';
      const r = await fetch(url, { headers: H });
      if (!r.ok) { res.status(502).json({ error: 'db_read_failed', status: r.status }); return; }
      const best = bestPerPlayer(await r.json().catch(() => []));

      // 국가별 순위 — 선수별 최고기록을 국가로 묶는다.
      // 정렬은 '그 나라 최고 기록'. 이 게임의 모든 순위가 기록 기준이라 여기만 참가자 수로
      // 세면 의미가 어긋난다. 참가자 수는 옆에 함께 보여 준다.
      if (clean(q.view || '', 8) === 'country') {
        const byCc = new Map();
        for (const x of best) {
          if (!x.country) continue;                       // 국가 컬럼이 생기기 전 기록은 제외
          const c = byCc.get(x.country) || { cc: x.country, players: 0, best: Infinity };
          c.players++; c.best = Math.min(c.best, +x.time_sec);
          byCc.set(x.country, c);
        }
        const list = [...byCc.values()].sort((a, b) => a.best - b.best);
        // 내 나라 표시도 요청 헤더로 판단한다(클라이언트 주장 불신 — 제출 때와 같은 기준)
        const mine = String(req.headers['x-vercel-ip-country'] || '').toUpperCase();
        let myCountry = null;
        const out = list.map((c, i) => {
          const row = { rank: i + 1, cc: c.cc, players: c.players, t: c.best, me: c.cc === mine };
          if (row.me) myCountry = row;
          return row;
        });
        res.status(200).json({
          ok: true, scope, view: 'country', week: wk, day: day || null, event: ev,
          countries: out.slice(0, 50), players: out.length, myCountry
        });
        return;
      }

      let myRank = null, myTime = null;
      for (let i = 0; i < best.length; i++) {
        if (aid && best[i].aid === aid) { myRank = i + 1; myTime = +best[i].time_sec; break; }
      }
      res.status(200).json({
        ok: true, scope, week: wk, day: day || null, event: ev,
        players: best.length,
        top: best.slice(0, 50).map((x, i) => ({
          rank: i + 1, cc: x.country || null,
          name: (x.player_name || '').trim() || null,
          pi: x.pi_name || null,
          t: +x.time_sec,
          me: !!(aid && x.aid === aid)
        })),
        myRank, myTime
      });
    } catch (e) {
      res.status(500).json({ error: 'fetch_failed', message: String((e && e.message) || e) });
    }
    return;
  }

  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  // ---------------- 기록 제출 ----------------
  let b = null;
  try { b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch (e) {}
  if (!b) { res.status(400).json({ error: 'bad_body' }); return; }

  const ev = clean(b.event_id, 12);
  const time = Number(b.time_sec);
  const day = clean(b.day, 12);
  const aid = clean(b.aid, 40);
  const nick = clean(b.nickname, 20);

  if (!FLOOR[ev] || !day) { res.status(400).json({ error: 'bad_event' }); return; }
  if (!isFinite(time) || time < FLOOR[ev] || time > CEIL) {
    // 물리적으로 불가능한 기록 — 조용히 버린다(공격자에게 경계선을 알려주지 않는다)
    res.status(200).json({ ok: true, skipped: 'out_of_range' }); return;
  }

  // Pi 인증 배지는 서버가 직접 확인한 경우에만
  let piName = null;
  if (b.accessToken) {
    try {
      const me = await fetch('https://api.minepi.com/v2/me', { headers: { Authorization: 'Bearer ' + String(b.accessToken) } });
      if (me.ok) { const u = await me.json(); if (u && u.username) piName = clean(u.username, 20); }
    } catch (e) {}
  }
  // 인증되지 않은 사람이 π를 붙여 인증된 척하지 못하게 앞의 π/공백을 벗긴다
  let name = nick;
  while (name.length && (name.charCodeAt(0) === 0x03c0 || name.charCodeAt(0) === 32)) name = name.slice(1);

  // 국가: Vercel이 요청에 붙여주는 국가 코드(예: KR). 사용자가 입력하지 않아도 되고,
  // 클라이언트가 보낸 값을 믿지 않는다(국기를 마음대로 바꿔 다는 걸 막는다).
  // 저장하는 건 **국가 코드 2글자뿐** — IP는 저장하지 않는다.
  const cc = String(req.headers['x-vercel-ip-country'] || '').toUpperCase();
  const country = /^[A-Z]{2}$/.test(cc) && cc !== 'XX' ? cc : null;

  try {
    if (aid) {
      const c = await fetch(SB_URL + '/rest/v1/' + TABLE
        + '?select=id&wk=eq.' + encodeURIComponent(wk) + '&aid=eq.' + encodeURIComponent(aid)
        + '&limit=' + (MAX_PER_WEEK + 1), { headers: H });
      if (c.ok) {
        const rows = await c.json().catch(() => []);
        if (Array.isArray(rows) && rows.length > MAX_PER_WEEK) { res.status(200).json({ ok: true, skipped: 'rate' }); return; }
      }
    }
    const w = await fetch(SB_URL + '/rest/v1/' + TABLE, {
      method: 'POST', headers: { ...H, Prefer: 'return=minimal' },
      body: JSON.stringify([{ event_id: ev, time_sec: time, day, wk, aid: aid || null, country,
                              player_name: name || null, pi_name: piName, verified: !!piName }])
    });
    if (!w.ok) { const t = await w.text().catch(() => ''); res.status(502).json({ error: 'db_write_failed', detail: t.slice(0, 200) }); return; }
    res.status(200).json({ ok: true, week: wk, verified: !!piName, country });
  } catch (e) {
    res.status(500).json({ error: 'submit_failed', message: String((e && e.message) || e) });
  }
}
