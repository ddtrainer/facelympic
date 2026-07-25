# Facelympic — Mainnet 출시 준비 체크리스트

> 상태: Testnet 전 기능 작동 + Test-Pi 결제 성공 확인(2026-07-24).
> Mainnet 출시는 코드 외에 **Pi 심사·법률 검토**가 필수 관문. 아래 4영역 모두 통과해야 함.

---

## A. 코드 — Claude가 할 수 있음 (Testnet 안 깨고 지금 가능)

- [ ] **A1. 개인정보 처리방침에 얼굴 데이터 조항 추가**
  - 사실: 얼굴 인식은 100% 기기 내(브라우저 MediaPipe WASM) 처리, 서버 전송 없음(검증됨).
  - 방침에 "카메라 영상·얼굴 데이터는 기기에서만 처리되며 저장·전송하지 않음" 명시 → 신뢰 + 법적 고지.
- [ ] **A2. 결제 지급 로직 확장** — 현재 `piComplete`가 스킨만 지급(`meta.type==='skin'`). Pi로 모자/테마도 팔면 확장 필요.
- [x] **A3. 구매 보존·복원(필수, 완료 2026-07-25)** — 구매가 localStorage에만 있으면 데이터삭제·폰교체 시 **실제 Pi로 산 아이템이 영구 소실**(환불분쟁). 구현: `api/entitlements.js`(Pi 토큰을 서버에서 /me 검증 → uid에 묶어 기록/복원), 결제완료 시 `recordPurchase`, Pi 검증 시 `restorePurchases`, 실패 시 대기열 재시도(`fl_pend_buy`), "내 데이터 삭제"가 구매는 보존, 완료 실패 시 사용자 안내(`buy_pending`).
  - ⚠️ **B5·B6(아래) 설정 전까지는 서버 보관이 작동하지 않음**(로컬 지급 + 대기열 보관은 정상 동작).
- [ ] **A4. 결제 엣지케이스 재점검** — 취소/네트워크 실패/미완료 결제 복구(onIncompletePaymentFound) 흐름 재확인.
- [ ] **A5. `PI_SANDBOX = false` 전환** — ⚠️ **출시 순간에만**. 지금 바꾸면 Testnet 테스트가 멈춤. 마지막 단계.

## B. 사용자 액션 — Pi/Vercel/계정 (Claude 대행 불가)

- [ ] **B1. API 키 재발급** — 채팅에 노출됨. App Studio에서 regenerate → Vercel `PI_API_KEY` 값 교체 → 재배포.
- [ ] **B2. Pi Mainnet 리스팅/앱 검증 신청** — Pi Developer Portal의 Mainnet 심사 절차. Testnet 등록과 별개.
- [ ] **B3. 앱 메타데이터 등록** — 이름/설명/아이콘/카테고리/**개인정보 처리방침 URL**/도메인 확인.
- [ ] **B4. 개발자 KYC** — Pi가 요구 시.
- [ ] **B5. Supabase 구매 테이블 생성** — 아래 SQL을 Supabase 대시보드 > SQL Editor에서 실행.
  ```sql
  create table if not exists public.fl_purchases (
    id bigserial primary key,
    uid text not null,                 -- Pi 계정 고유 id(서버가 /me로 검증한 값만 기록)
    item_id text not null,
    kind text not null,                -- skin | theme | hat
    payment_id text,
    txid text,
    created_at timestamptz not null default now(),
    constraint fl_purchases_uid_item_key unique (uid, item_id)
  );
  -- RLS 켜고 정책은 만들지 않는다 = 공개 anon 키로는 접근 불가(위조 삽입 차단).
  -- service_role 키는 RLS를 우회하므로 서버 함수만 읽고 쓴다.
  alter table public.fl_purchases enable row level security;
  ```
- [ ] **B6. Vercel 환경변수 `SUPABASE_SERVICE_KEY` 추가** — Supabase > Project Settings > API > **service_role** 키를 복사해 Vercel 환경변수로 등록 후 재배포.
  - ⚠️ service_role 키는 **절대 클라이언트·채팅에 노출 금지**(anon 키와 달리 모든 권한).
  - 확인: `curl -X POST https://facelympic.vercel.app/api/entitlements -H 'Content-Type: application/json' -d '{"action":"list","accessToken":"x"}'` → `no_service_key`가 아니라 `invalid_token`이 나오면 설정 완료.

## C. 법률·정책 — 전문가 검토 필수 (⚠️ "완전 안전" 단정 불가)

- [ ] **C1. 이용약관·개인정보 처리방침 정식 법률 검토** — 현재 초안(ko/en). 결제+카메라 처리 앱이라 검토 권장.
- [ ] **C2. 얼굴/카메라 데이터 고지** — 생체정보 관련 법규는 지역별 상이(EU/미국 일부 州 등). 기기내 처리라도 고지·동의 필요할 수 있음.
- [ ] **C3. 결제·환불 정책** — 디지털 상품(스킨 등) 환불 규정.
- [ ] **C4. 세금/사업자** — 실제 Pi 수령 = 잠재적 가치. 지역 세무·사업자 요건 확인.
- [ ] **C5. 반도박 원칙 재확인** — 현재 설계상 꾸미기만·경쟁 무영향(준수). 법률 검토 시 함께.
- [ ] **C6. 장문 약관 15개 언어 현지화** — 현재 ko/en만, 나머지 13개 영어 폴백.

## D. 품질·안정성

- [ ] **D1. 다기기 호환 최종 점검** — 폴드7 등 이슈 재발 없는지(카메라 진단 도구 활용).
- [ ] **D2. 밸런스 최종 확인** — 난이도/메달/EP 며칠 플레이 체감.

---

## 출시 순서 (권장)

1. **C1(법률 검토)를 가장 먼저 시작** — 시간이 제일 오래 걸리는 외부 의존. 병렬로 나머지 진행.
2. A1~A4 코드 준비 (Claude) + B2~B4 Pi 심사 신청 (사용자) 병행.
3. Pi 심사 통과 + 법률 검토 완료 후:
4. **마지막 날**: B1(키 재발급) → A5(`PI_SANDBOX=false`) → 최종 배포 → Mainnet 전환.

## 참고
- 결제 코드는 이미 구현·검증됨(approve/complete/미완료복구). App Studio "GenAI 프롬프트" 재실행 금지(덮어쓰기 위험).
- 얼굴 데이터 기기내 처리 = 검증된 사실이자 마케팅 포인트.
