-- 순위표 정리 (Supabase → SQL Editor → Run)
-- 두 가지를 한다: ①검증용 테스트 기록 삭제 ②기존 기록에 주차 채우기

-- ① 검증용으로 넣었던 테스트 기록 삭제
--    하한선(위조 판정 기준)이 실제로 동작하는지 확인하려고 두 건을 보냈다.
--      · 0.1초 "FAKE"        → 예상대로 거부됨(테이블에 없음)
--      · 7.80초 "PROBE-FAST" → 통과되어 지금 이번 주 1위에 올라가 있다
--    테이블이 잠겨 있어 여기(SQL Editor)에서만 지울 수 있다.
delete from fl_scores
where aid in ('probe-fast', 'probe-fake')
   or player_name in ('PROBE-FAST', 'FAKE');

-- ② 주차(wk) 채우기 — '이번 주' 탭이 오늘 기록을 놓치던 원인
--    wk 컬럼이 생기기 전에 들어온 기록은 wk가 비어 있어 주간 집계에서 빠졌다
--    ('오늘' 10명 vs '이번 주' 2명). day 값으로 주차를 계산해 채운다.
--    날짜 형식이 '2026-7-30'처럼 0이 없는 것도 있어 형식이 맞는 행만 처리한다.
update fl_scores
set wk = to_char(day::date, 'IYYY-"W"IW')
where wk is null
  and day ~ '^\d{4}-\d{1,2}-\d{1,2}$';

-- 확인 — 이번 주 단거리에 남은 기록(진짜 기록만, 사람마다 한 줄씩 보여야 한다)
select player_name, pi_name, time_sec, day, wk
from fl_scores
where event_id = 'sprint' and wk = to_char(now(), 'IYYY-"W"IW')
order by time_sec asc;
