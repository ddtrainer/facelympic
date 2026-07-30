-- Facelympic 순위표 — 국가 표시 추가 (Supabase → SQL Editor에 붙여넣고 Run)
--
-- 새로 필요한 건 country 컬럼 하나뿐이다. 나머지는 이미 적용돼 있으면 그냥 통과한다.
-- 국가는 Vercel이 요청에 붙여주는 국가 코드(예: KR)를 서버가 저장한다.
-- **IP는 저장하지 않고 2글자 국가 코드만** 남긴다. 클라이언트가 보낸 값은 믿지 않으므로
-- 국기를 임의로 바꿔 달 수 없다.
-- ⚠️ 이미 쌓인 기록에는 국가가 없다(컬럼이 없던 때라). 앞으로의 기록부터 국기가 붙는다.

alter table fl_scores add column if not exists country text;

-- (이미 되어 있으면 통과) 순위표에 필요한 나머지 컬럼·인덱스
alter table fl_scores add column if not exists aid     text;
alter table fl_scores add column if not exists wk      text;
alter table fl_scores add column if not exists pi_name text;
create index if not exists fl_scores_week_idx on fl_scores (event_id, wk, time_sec);
create index if not exists fl_scores_day_idx  on fl_scores (event_id, day, time_sec);
create index if not exists fl_scores_all_idx  on fl_scores (event_id, time_sec);   -- 누적(전체) 탭용

-- 확인
select count(*) as 전체기록, count(country) as 국가있는기록 from fl_scores;
