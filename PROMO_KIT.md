# 홍보 실행 키트

> 도전장 뿌리기 · 데모 영상 · 데이터 확인 — 이 3가지를 위한 실전 참고 문서
> 최종 수정 2026-07-29

---

## 1. 도전장 뿌리기

### 보내는 순서
1. Pi Browser에서 한 판 완주
2. 결과 화면 → **🏁 친구에게 도전장 보내기**
3. **📤 도전장 보내기**(공유) 또는 **🔗 링크 복사**
4. 카톡·문자로 전송

### 톡 문구 (복사용)

```
🏁 페이셀림픽 도전장!

링크 눌러서 화면 안내대로 하면 돼~
얼굴로 하는 달리기 게임이야 😄
웃으면 달리고, 눈썹 올리면 점프!

내 기록 이겨봐 ㅋㅋ
```

아이폰 친구가 많으면 한 줄 추가:
```
📱 아이폰은 화면 안내대로 사파리에서 열어줘!
```

### 목표
- **1차: 20~30명**에게 전송 → 퍼널 숫자가 의미를 갖는 최소 규모
- 안드로이드 / 아이폰 / 카톡 / 문자를 **섞어서** 보낼 것 (환경별 차이 확인)

### 알아둘 것
| 환경 | 동작 |
|---|---|
| 안드로이드 + 카톡 | 자동으로 외부 브라우저 탈출 시도 |
| 아이폰 + 카톡 | 카메라 차단 → 앱이 "사파리에서 열어주세요" 안내 |
| Pi Browser | 카드 + Pi 로그인 전부 정상 |
| 일반 브라우저 | 게임 정상, Pi 로그인만 불가 |

---

## 2. 데모 영상

### 구성 (30~45초, 세로)
| 구간 | 내용 | 자막 |
|---|---|---|
| 0~3초 | 웃자마자 캐릭터가 튀어나감 | **"웃으면 빨라집니다"** |
| 3~15초 | 조작 4개 — 웃기·눈썹·기울이기·입벌림 | 동작별 짧은 자막 |
| 15~25초 | **피버 터지는 순간** 🔥 | "5연속 성공 = 피버!" |
| 25~33초 | 결과 — 기록·메달·오늘의 얼굴 운동 | "9.42초 · 금메달" |
| 33~40초 | 도전장 보내기 → 친구가 여는 장면 | "친구에게 도전장" |
| 마무리 | 로고 + 접속 안내 | "Pi Browser에서 지금 플레이" |

### 촬영 팁
- **화면 녹화만으로 충분** — 게임 화면 우측 하단에 웹캠 PIP가 이미 있어서 얼굴+게임이 같이 잡힘
- 밝은 곳, 얼굴 정면
- 표정은 평소보다 **크게** (영상에선 작게 보임)
- **단거리(9초)** 로 찍으면 편집이 쉬움
- **소리 켜기** — 효과음이 재미의 절반 (피버 팡파르!)
- **자막 필수** — 무음으로 보는 사람이 대부분

### 한 단계 더
친구 2~3명이 플레이하는 **리액션 컷**을 넣으면 훨씬 강해짐.
(얼굴 게임은 남이 우스꽝스러운 표정 짓는 걸 보는 재미가 큼)

### 재사용처
Pi 커뮤니티 · 카톡/SNS · 해커톤 제출 · **코어팀 피칭** · 앱 소개

---

## 3. 데이터 확인

Supabase → **SQL Editor**에 붙여넣고 Run.

### ① 퍼널 한눈에 보기 (매일 이거 하나만)

```sql
select day,
  count(distinct aid) filter (where ev='land')        as "①방문",
  count(distinct aid) filter (where ev='land' and meta->>'c'='1') as "└도전장유입",
  count(distinct aid) filter (where ev='consent_ok')  as "②동의",
  count(distinct aid) filter (where ev='cam_ok')      as "③카메라OK",
  count(distinct aid) filter (where ev='cam_fail')    as "└카메라실패",
  count(distinct aid) filter (where ev='warmup_done') as "④워밍업",
  count(distinct aid) filter (where ev='race_done')   as "⑤완주",
  count(*)            filter (where ev='race_done')   as "총판수",
  count(distinct aid) filter (where ev='share')       as "공유",
  count(distinct aid) filter (where ev='land' and pi=1) as "PiBrowser"
from fl_events
where aid <> '__setup_probe__'
group by day
order by min(ts) desc
limit 7;
```

**읽는 법:** ①→⑤ 숫자가 **크게 줄어드는 구간이 이탈 지점**. 거기만 고치면 됨.

| 패턴 | 해석 |
|---|---|
| 방문 30 → 카메라OK 12 | 카메라가 벽 → 권한 안내 개선 |
| 카메라OK 25 → 완주 8 | 워밍업이 길거나 게임이 어려움 |
| 완주는 많은데 재방문 0 | 리텐션 문제 |

### ② 카메라 실패 원인별

```sql
select meta->>'e' as 오류, count(distinct aid) as 명수
from fl_events where ev='cam_fail' group by 1 order by 2 desc;
```

### ③ 재방문(리텐션)

```sql
select a.day as "첫날",
       count(distinct a.aid) as "그날 방문",
       count(distinct b.aid) as "다시 온 사람"
from (select distinct aid, day from fl_events where ev='land') a
left join (select distinct aid, day from fl_events where ev='land') b
       on a.aid=b.aid and b.day <> a.day
group by a.day order by a.day desc limit 7;
```

### ④ 종목별 플레이·평균 기록

```sql
select meta->>'ev' as 종목,
       count(*) as 판수,
       round(avg((meta->>'t')::numeric),2) as 평균기록
from fl_events where ev='race_done' group by 1 order by 2 desc;
```

---

## 4. 확인 주기

- **홍보 직후 1~2일**: 하루 한 번 ① 실행
- **20~30명 도달 후**: 결과를 개발자와 공유 → 이탈 지점 확정 → 처방 결정
- 그 전까지는 **새 기능 추가 중단** (추측으로 만들면 헛수고)

---

## 5. 문제 생기면

- 앱이 안 뜬다 / 이상하다 → **설정 ⚙️ → 🔍 카메라 진단** 캡처
  - 첫 줄 `build:` 로 최신 버전인지 확인
  - `cameras found: 0` 이면 기기 정책으로 카메라 차단된 기기
- 링크가 안 열린다 → 어느 앱/기기에서 열었는지 함께 알려주기
