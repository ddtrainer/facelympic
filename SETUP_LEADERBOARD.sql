-- Facelympic 순위표 준비 (Supabase → SQL Editor에 붙여넣고 Run)
-- 하는 일: ①주간·선수 구분용 컬럼 추가 ②조회 인덱스 ③테이블 잠그기 ④예전 테스트 기록 정리

-- ① 컬럼 추가 (이미 있으면 건너뜀)
alter table fl_scores add column if not exists aid     text;   -- 익명 기기 ID(선수당 최고기록 1개만 남기는 용도)
alter table fl_scores add column if not exists wk      text;   -- 주차 키 2026-W31 (주간 순위표)
alter table fl_scores add column if not exists pi_name text;   -- 서버가 검증한 Pi 사용자명(검증 안 되면 비어 있음)

-- ② 순위표 조회용 인덱스
create index if not exists fl_scores_week_idx on fl_scores (event_id, wk, time_sec);
create index if not exists fl_scores_day_idx  on fl_scores (event_id, day, time_sec);

-- ③ 🔒 테이블 잠그기 — 여기가 핵심
--    지금은 공개 anon 키로 아무나 읽고 쓸 수 있어서, 이름이 붙은 순위표를 열면
--    누구나 0.1초짜리 가짜 기록을 꽂아 넣을 수 있다.
--    RLS를 켜고 정책을 하나도 두지 않으면 anon 키로는 아무것도 못 하고,
--    서버(service key)만 접근할 수 있다. 앱은 /api/score 를 통해서만 읽고 쓴다.
alter table fl_scores enable row level security;
drop policy if exists "public read"   on fl_scores;
drop policy if exists "public insert" on fl_scores;

-- ④ 예전 테스트 기록 정리 (2026-06 셋업 때 들어간 값들 — 주차 정보가 없어 순위표엔 안 뜨지만 깔끔하게)
delete from fl_scores where event_id = '__test__';

-- 확인
select count(*) as 전체기록, count(wk) as 주차있는기록 from fl_scores;
