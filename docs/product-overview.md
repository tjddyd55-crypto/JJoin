# JJoin — Product Overview (SSOT)

> 상태: 1차 기획 + Auth/Identity 보강  
> 초기 서비스: 대한민국 · 한국어 · KRW · Asia/Seoul  
> MVP 종목: 스크린골프 (`SPORT.code = SCREEN_GOLF`)

## 1. 한 줄 정의

현재 위치 주변의 스포츠 시설을 찾아 함께 운동할 사람을 모집하고,  
조인 생성·참가 보상에 코인을 활용하는 **지역 기반 스포츠 조인 플랫폼**.

코인은 향후 상품/서비스 등에 사용할 수 있다 → **Future Scope** (Shop은 1차 제외).

UX Blueprint: Figma Full Visualization (Phase 3B) — [phase3b-report.md](./phase3b-report.md) · Present 수동 Click QA pending.

## 2. 핵심 사이클

```
AUTH → LOCATION → VENUE → JOIN → PARTICIPATION → GAME → REWARD → WALLET
                                                    └→ (Future) COMMERCE
```

## 3. 아키텍처 원칙

| 원칙 | 설명 |
|------|------|
| Sport-agnostic core | 스크린골프 전용 핵심 테이블 금지 |
| Social Auth first | Kakao / Naver / Google. ID/PW 메인 아님 |
| Identity ≠ Public Profile | 본인확인 정보와 공개 프로필 분리 |
| Trust Gate | 조회는 가능, 조인 생성·참가·코인은 본인확인 후 |
| Wallet + Ledger + HOLD | 생성비 ≠ 참가 보상 |
| Settlement per participant | 참가자별 정산 + 24h auto-pay |
| Policy TBD isolation | 코인 가치·법률 문구·Provider 미확정 |

## 4. 사용자

- 단일 `USER` (Host/Participant는 Join 컨텍스트)
- Social Account 연동
- Identity Verification 상태
- Public Profile + Sport Profile (Screen Golf skill)

## 5. MVP 포함 / 제외

### 포함 (1차)
소셜 로그인·약관·본인확인 Gate·프로필/사진,  
위치 기반 Venue/Join, 조인 생성·참가, 모집 조건,  
코인 생성비·HOLD·정산·24h 자동지급·분쟁, Wallet, My Page

### 제외 / Future
Shop·결제 실연동, OAuth/본인확인 실계약, Storage 실업로드,  
채팅·리뷰/매너점수, 복수 종목 실서비스, Coin 경제 수치 확정

## 6. 대표 시나리오

거제 출장 Host가 조인 생성 → 로컬 Participant 참가 → 정산/보상.  
신규 유저는 Social → 약관 → 본인확인 → 프로필 → Home.  
미인증 유저가 참가/생성 시 Identity Gate.

## 7. 관련 문서

- [auth-identity.md](./auth-identity.md)
- [user-flow.md](./user-flow.md)
- [domain-model.md](./domain-model.md)
- [coin-settlement.md](./coin-settlement.md)
- [figma-screen-map.md](./figma-screen-map.md)
- [policy-tbd.md](./policy-tbd.md)
- [phase1-report.md](./phase1-report.md)
