// Facelympic — 익명 지표 집계 조회 (읽기 전용)
// 목적: 퍼널·이탈 지점·기록 분포를 링크 하나로 확인. 폰에서도 열람 가능.
//
// 개인정보 원칙:
//  - 익명 ID(aid)는 **중복 제거 계산에만** 쓰고 응답에 절대 담지 않는다.
//  - 원본 행을 반환하지 않는다. 집계 숫자만.
//  - 얼굴·영상 데이터는 애초에 수집하지 않음(기기 내 처리).
//
// 보안: STATS_KEY(환경변수)와 일치하는 ?k= 가 있어야 응답. DB 접근은 service key로만.
const SB_URL = 'https://yixigkpyncjmbfyaocjl.supabase.co';
const TABLE = 'fl_events';
const PAGE = 1000;        // PostgREST 기본 상한
const MAX_ROWS = 50000;   // 안전 상한

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const STATS_KEY = process.env.STATS_KEY;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!STATS_KEY) { res.status(500).json({ error: 'no_stats_key' }); return; }
  if (!SB_KEY) { res.status(500).json({ error: 'no_service_key' }); return; }

  const k = (req.query && req.query.k) || '';
  if (k !== STATS_KEY) { res.status(401).json({ error: 'bad_key' }); return; }

  const days = Math.min(60, Math.max(1, parseInt((req.query && req.query.days) || '14', 10) || 14));
  const since = new Date(Date.now() - days * 86400000).toISOString();

  // ---- 데이터 적재(페이지네이션) ----
  const rows = [];
  try {
    for (let from = 0; from < MAX_ROWS; from += PAGE) {
      const url = SB_URL + '/rest/v1/' + TABLE
        + '?select=aid,ev,day,meta,lang,pi,ts&ts=gte.' + encodeURIComponent(since)
        + '&order=ts.asc';
      const r = await fetch(url, {
        headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY,
                   Range: from + '-' + (from + PAGE - 1) }
      });
      if (!r.ok) { res.status(502).json({ error: 'db_read_failed', status: r.status }); return; }
      const page = await r.json().catch(() => []);
      if (!Array.isArray(page) || !page.length) break;
      for (const x of page) if (x.aid !== '__setup_probe__') rows.push(x);
      if (page.length < PAGE) break;
    }
  } catch (e) {
    res.status(500).json({ error: 'fetch_failed', message: String((e && e.message) || e) }); return;
  }

  // ---- 집계 ----
  const S = new Set(), byDay = new Map(), camFail = new Map(), langs = new Map();
  const evStat = new Map();                 // 종목별 기록
  const seenDays = new Map();               // aid -> Set(day)  (리텐션용, 응답엔 안 담음)
  const uniq = (m, day, key, aid) => {      // 일자별 고유 인원
    if (!byDay.has(day)) byDay.set(day, {});
    const d = byDay.get(day);
    if (!d[key]) d[key] = new Set();
    d[key].add(aid);
  };

  for (const x of rows) {
    const day = x.day || '?', aid = x.aid, ev = x.ev, meta = x.meta || {};
    S.add(aid);
    if (!seenDays.has(aid)) seenDays.set(aid, new Set());
    if (ev === 'land') seenDays.get(aid).add(day);

    if (ev === 'land') {
      uniq(byDay, day, 'land', aid);
      if (String(meta.c) === '1') uniq(byDay, day, 'chal', aid);
      if (x.pi) uniq(byDay, day, 'pi', aid);
      if (x.lang) langs.set(x.lang, (langs.get(x.lang) || 0) + 1);
    } else if (ev === 'consent_ok') uniq(byDay, day, 'consent', aid);
    else if (ev === 'cam_ok')     uniq(byDay, day, 'camOk', aid);
    else if (ev === 'cam_fail') { uniq(byDay, day, 'camFail', aid);
      const e = String(meta.e || 'unknown'); camFail.set(e, (camFail.get(e) || 0) + 1); }
    else if (ev === 'warmup_done' || ev === 'warmup_skip') uniq(byDay, day, 'warmup', aid);
    else if (ev === 'share') uniq(byDay, day, 'share', aid);
    else if (ev === 'race_done') {
      uniq(byDay, day, 'done', aid);
      const d = byDay.get(day); d.races = (d.races || 0) + 1;
      const id = String(meta.ev || '?'), t = Number(meta.t);
      if (!evStat.has(id)) evStat.set(id, { players: new Set(), races: 0, times: [] });
      const s = evStat.get(id); s.players.add(aid); s.races++;
      if (isFinite(t) && t > 0) s.times.push(t);
    }
  }

  const n = (d, k2) => (d[k2] ? d[k2].size : 0);
  const daysOut = [...byDay.entries()]
    .map(([day, d]) => ({
      day,
      land: n(d, 'land'), fromChallenge: n(d, 'chal'), consent: n(d, 'consent'),
      camOk: n(d, 'camOk'), camFail: n(d, 'camFail'), warmup: n(d, 'warmup'),
      finished: n(d, 'done'), races: d.races || 0, shared: n(d, 'share'), piBrowser: n(d, 'pi')
    }))
    .sort((a, b) => (a.day < b.day ? 1 : -1));

  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
  const tot = daysOut.reduce((a, d) => ({
    land: a.land + d.land, camOk: a.camOk + d.camOk, warmup: a.warmup + d.warmup,
    finished: a.finished + d.finished, races: a.races + d.races, shared: a.shared + d.shared
  }), { land: 0, camOk: 0, warmup: 0, finished: 0, races: 0, shared: 0 });

  const byEvent = [...evStat.entries()].map(([ev, s]) => {
    const t = s.times.slice().sort((a, b) => a - b);
    const med = t.length ? t[Math.floor(t.length / 2)] : null;
    return {
      event: ev, players: s.players.size, races: s.races,
      best: t.length ? +t[0].toFixed(2) : null,
      median: med != null ? +med.toFixed(2) : null,
      worst: t.length ? +t[t.length - 1].toFixed(2) : null
    };
  }).sort((a, b) => b.races - a.races);

  // 재방문: land 이벤트가 2일 이상인 익명 ID 비율
  let multi = 0, base = 0;
  for (const [, ds] of seenDays) { if (ds.size >= 1) base++; if (ds.size >= 2) multi++; }

  res.status(200).json({
    ok: true,
    windowDays: days,
    totalEvents: rows.length,
    uniqueVisitors: S.size,
    funnelTotal: {
      land: tot.land, camOk: tot.camOk, warmup: tot.warmup, finished: tot.finished,
      races: tot.races, shared: tot.shared,
      rate: { camOk: pct(tot.camOk, tot.land), warmup: pct(tot.warmup, tot.land),
              finished: pct(tot.finished, tot.land), racesPerFinisher: tot.finished ? +(tot.races / tot.finished).toFixed(1) : null }
    },
    byDay: daysOut,
    cameraFailures: [...camFail.entries()].map(([e, c]) => ({ error: e, count: c })).sort((a, b) => b.count - a.count),
    byEvent,
    retention: { visitors: base, returnedAnotherDay: multi, rate: pct(multi, base) },
    languages: [...langs.entries()].map(([l, c]) => ({ lang: l, events: c })).sort((a, b) => b.events - a.events)
  });
}
