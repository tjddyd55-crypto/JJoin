# Phase 1 Report — Auth / Identity 보강

Figma: https://www.figma.com/design/sL62yQIhgY1l0WUcksWuPo

## 1. Architecture 변경점

- Auth 레이어 추가: Social Login → Terms → Identity → Profile → Home
- Identity Gate: 조회 허용 / 조인 생성·참가·코인 활동은 본인확인 후
- Public Profile 분리 (실명·전화·CI 비공개)
- MY = Dashboard (Wallet 진입점). Wallet은 Bottom Nav 아님
- Shop 1차 제거 → Future Scope (“코인 향후 상품/서비스 사용” Vision만 유지)
- Sport skill은 `USER_SPORT_PROFILE`로 확장

## 2. 추가 DB Entity

`SOCIAL_ACCOUNT`, `IDENTITY_VERIFICATION`, `USER_SPORT_PROFILE`, `MEDIA_ASSET`  
`USER.identity_status`, `USER_PROFILE` 공개 필드 정리  
`PRODUCT`/`ORDER*` — Phase 1 Migration 제외

## 3–5. Flows / Profile 구분

- Auth / Identity / Gate: [auth-identity.md](./auth-identity.md)
- User flows E–H: [user-flow.md](./user-flow.md)
- 공개: avatar, nickname, verified badge, gender, age_band, region, bio, skill, join count  
- 비공개: 실명, 전화, CI/DI, 생년월일 원본, 본인확인 상세

## 6. Figma 신규·수정

신규: AUTH_01~05, AUTH_GATE_IdentityRequired, USER_01_PublicProfile, MY_01~04  
복구: CREATE_07_Done  
수정: JOIN/HOST/PARTICIPANT/Settlement에 ProfileChip  
제거: SHOP_01_List  
Legacy 보관: ZZ_LEGACY_MY_01_Profile, ZZ_LEGACY_WALLET_01_Home

## 7–8. Shop 제거 · Prototype

Shop 화면·CTA·Prototype 진입 제거.  
Prototype: E 가입 / F Gate / G Public Profile / H My / CREATE_06→07→HOST

## 9–10. Screenshot QA

검증: Login, Terms, Identity, Gate, MY Home, CREATE_07_Done (+ Public/Wallet 메타)  
**clipping(height≤12 + clips + text) 잔여: 0건**

## 11. POLICY_TBD

[policy-tbd.md](./policy-tbd.md)

---

## History note (Phase 2)

기술 스택·Monorepo·Prisma Foundation은 Phase 2에서 별도 기록한다.  
→ [phase2-report.md](./phase2-report.md) / [architecture.md](./architecture.md)  
Phase 1 Product/UX/Figma 결과는 삭제하지 않고 유지한다.

