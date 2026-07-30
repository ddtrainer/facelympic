-- Facelympic 순위표 — 2차 실행 (Supabase → SQL Editor에 붙여넣고 Run)
--
-- 1차 실행 결과: 컬럼·인덱스는 정상 추가됐고 순위표 API도 살아났다.
-- 그런데 **잠금이 걸리지 않았다.** 바깥에서 공개 anon 키로 가짜 기록(0.1초)을 넣는 데 성공했다.
-- 원인: 1차 스크립트가 "public read" / "public insert" 라는 **이름으로** 정책을 지우려 했는데,
--       실제 정책 이름이 달라서 하나도 삭제되지 않았다. RLS만 켜지고 정책은 그대로 남은 상태.
-- 그래서 이번엔 **이름과 무관하게 이 테이블의 정책을 전부** 제거한다.
--
-- ⚠️ "destructive operations" 경고는 또 뜬다 — drop policy / delete 때문이며 의도한 것이다.
--    지우는 대상은 ①공개 접근 정책 ②아래에 적힌 테스트 행 2개뿐. 실제 경기 기록은 건드리지 않는다.

-- ① 컬럼·인덱스 (1차에서 이미 됐으면 그냥 통과)
alter table fl_scores add column if not exists aid     text;
alter table fl_scores add column if not exists wk      text;
alter table fl_scores add column if not exists pi_name text;
create index if not exists fl_scores_week_idx on fl_scores (event_id, wk, time_sec);
create index if not exists fl_scores_day_idx  on fl_scores (event_id, day, time_sec);

-- ② 🔒 진짜 잠금 — 이 테이블의 모든 정책을 이름과 무관하게 제거
alter table fl_scores enable row level security;
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'fl_scores'
  loop
    execute format('drop policy %I on public.fl_scores', p.policyname);
  end loop;
end $$;

-- 정책이 하나도 없는 상태에서 RLS가 켜져 있으면 anon 키로는 아무것도 못 한다.
-- 앱은 서버(/api/score, service key)로만 접근하므로 영향이 없다. 아래는 추가 안전장치.
revoke all on table fl_scores from anon;

-- ③ 테스트 행 정리
--    'HACKER'는 잠금이 실제로 걸렸는지 확인하려고 바깥에서 넣어본 가짜 기록(0.1초)이다.
--    잠금이 안 걸려 있어서 들어갔고, anon으로는 지울 수 없어 여기서 지운다.
delete from fl_scores where player_name = 'HACKER';
delete from fl_scores where event_id = '__test__';

-- ④ 확인 — 정책수가 0이어야 하고, 가짜기록은 0이어야 한다
select
  (select count(*) from pg_policies where schemaname='public' and tablename='fl_scores') as 남은정책수,
  (select count(*) from fl_scores) as 전체기록,
  (select count(*) from fl_scores where player_name='HACKER') as 가짜기록;
