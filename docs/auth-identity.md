# Auth · Identity · Profile (SSOT)

> Phase 1 보강. OAuth/본인확인 Vendor 실연동은 범위 밖.  
> 민감정보 최소수집. 공개 프로필 ≠ Identity.

## 1. Goals

- 소셜 로그인 중심 온보딩 (Kakao / Naver / Google)
- 한국형 본인확인으로 오프라인 조인 신뢰 확보
- 조회와 조인 활동 Gate 분리
- 공개 프로필로 “누구와 치는지” 판단 가능

## 2. Auth Providers (Phase 1 UX)

| Provider | UX 라벨 |
|----------|---------|
| Kakao | 카카오로 시작하기 |
| Naver | 네이버로 시작하기 |
| Google | Google로 시작하기 |

ID/PW 메인은 하지 않음.  
Account Linking 세부 정책: `AUTH_POLICY_TBD`

## 3. Onboarding Flows

### 기존 사용자
```
AUTH_01_Login → Social OK → HOME
```

### 신규 사용자
```
AUTH_01_Login
→ AUTH_02_Terms
→ AUTH_03_IdentityVerification
→ AUTH_04_ProfileSetup
→ AUTH_05_ProfilePhoto
→ HOME
```

## 4. Identity Verification

- UI: “휴대폰으로 본인확인”
- Provider 후보: NICE / KCB / PASS → `POLICY_TBD` (미확정)
- 주민등록번호 원문 **저장 금지**
- 상태: `UNVERIFIED | PENDING | VERIFIED | FAILED`

### Gate (1차 UX 기본안)

| 기능 | 미인증 | 인증 완료 |
|------|--------|-----------|
| Home / Explore / Venue / Join 조회 | ✅ | ✅ |
| Join 생성 | ❌ Gate | ✅ |
| Join 참가 | ❌ Gate | ✅ |
| Coin / Wallet 활동 | ❌ Gate | ✅ |

Gate copy: “조인 활동을 위해 본인확인이 필요합니다.”  
→ 본인확인 → 원래 행동 Return

최종 강제 범위는 `POLICY_TBD`로 조정 가능.

## 5. Public vs Private

### 공개 (USER_01_PublicProfile)
- avatar, nickname, verified badge
- gender, age band (정책에 따라)
- region, bio, sport skill
- join count (집계)

### 비공개
- 실명, 전화, CI/DI, 생년월일 원본, 본인확인 상세

후기/매너점수: Future Scope

## 6. Entities (요약)

- `USER`
- `SOCIAL_ACCOUNT` UNIQUE(provider, provider_subject)
- `IDENTITY_VERIFICATION`
- `USER_PROFILE` (공개 편집 가능 필드)
- `USER_SPORT_PROFILE` (sport_id + skill_level) — Screen Golf만 사용
- `MEDIA_ASSET` (avatar) — Storage 실연동 Future

상세 컬럼: [domain-model.md](./domain-model.md)

## 7. My Page IA

```
MY_01_Home
  ├ Profile summary + Edit CTA
  ├ MY WALLET summary → MY_04_Wallet
  ├ 내가 만든 / 참가한 조인
  ├ 프로필 수정 → MY_02_EditProfile
  ├ 계정 → MY_03_Account
  ├ 알림 / 약관 / 개인정보 / 로그아웃
```

Wallet은 Bottom Nav에 두지 않음. Shop CTA 없음.

## 8. POLICY_TBD / LEGAL_TBD

- 약관·개인정보 법률 문구
- 본인확인 Provider·요금·재인증
- 연령대 공개 방식 (생년 기반 vs 선택 입력)
- Gate 강제 범위 최종안
- Nickname 변경 제한 / 중복 정책
- Avatar 기본 이미지·검수
- Social account linking / 탈퇴
- Coin 가치 (기존 유지)

## 9. Phase 3A Implementation Note

- Mock social sign-in: `POST /auth/social/mock-sign-in`
- AuthAppState: UNAUTHENTICATED / NEEDS_TERMS / PROFILE_INCOMPLETE / IDENTITY_UNVERIFIED / READY
- Identity Gate + PendingActionIntent return path implemented
- Real OAuth / NICE adapters replace Mock* without Screen rewrites
- Details: [phase3a-report.md](./phase3a-report.md)
