# App Screen Inventory (Phase 3B SSOT)

Figma: https://www.figma.com/design/sL62yQIhgY1l0WUcksWuPo  
기준: Mobile App Primary · 390px · Wireframe UX Blueprint (최종 Brand Design 아님)

Status: `IMPLEMENTED` | `NEEDS_UPDATE` | `MISSING` | `FUTURE`

---

## Summary (pre-Phase3B audit)

| Status | Count (approx) |
|--------|----------------|
| IMPLEMENTED (usable wireframe) | 30 (+ 2 ZZ_LEGACY) |
| NEEDS_UPDATE | ~12 |
| MISSING (required for Full UX) | ~35 |
| FUTURE (Shop/OAuth vendor UI 등) | excluded |

---

## AUTH / APP START

| Screen ID | Purpose | Entry | Exit | Role | Major State | Proto | Status |
|-----------|---------|-------|------|------|-------------|-------|--------|
| APP_00_Splash | 앱 기동 | OS launch | Login/Home | All | loading brand | START A/B | MISSING |
| AUTH_01_Login | Social login | Splash / logout | Terms or Home | Guest | idle/loading/fail | A/B | IMPLEMENTED |
| AUTH_02_Terms | 약관 | Login(new) | Identity | New | required unchecked | A | IMPLEMENTED |
| AUTH_03_IdentityVerification | 본인확인 시작 | Terms / Gate | Verifying | New/Gate | idle | A/E | IMPLEMENTED |
| AUTH_03A_IdentityVerifying | 인증 중 | AUTH_03 CTA | Success/Fail | New/Gate | pending | A/E | MISSING |
| AUTH_03B_IdentitySuccess | 성공 | Verifying | Profile / Return | New/Gate | success | A/E | MISSING |
| AUTH_03C_IdentityFailed | 실패·재시도 | Verifying | AUTH_03 | New/Gate | fail | A/E | MISSING |
| AUTH_04_ProfileSetup | 공개 프로필 | Identity OK | Photo | New | form | A | IMPLEMENTED |
| AUTH_05_ProfilePhoto | 아바타 | Profile | Location/Home | New | pick/skip | A | IMPLEMENTED |
| AUTH_GATE_IdentityRequired | Gate modal | Create/Join | Identity / Later | Unverified | overlay | E | IMPLEMENTED |
| LOCATION_01_Permission | 위치 사전 안내 | Photo/Home | System / Home | New | pre-permission | A | NEEDS_UPDATE (was ONBOARDING_01) |
| LOCATION_02_PermissionDenied | 거부 안내 | Denied | Settings/Explore | All | denied | — | MISSING |

## DISCOVERY

| Screen ID | Purpose | Entry | Exit | Role | Major State | Proto | Status |
|-----------|---------|-------|------|------|-------------|-------|--------|
| HOME_01_Feed | 메인 홈 | Tab | Explore/Create/Join | All | feed | B/C/D | NEEDS_UPDATE |
| EXPLORE_01_Map | 지도 탐색 | Tab | Venue/Join/Search | All | map | C | NEEDS_UPDATE |
| EXPLORE_02_List | 리스트 토글 | Map toggle | Venue/Join | All | list | C | MISSING |
| EXPLORE_03_LocationSearch | 지역 검색(거제 등) | Explore | Map/List | All | search | C | MISSING |
| VENUE_01_Detail | 장소 상세 | Explore/Join | Join/Create | All | joins open/empty | C/D | NEEDS_UPDATE |

## JOIN

| Screen ID | Purpose | Entry | Exit | Role | Major State | Proto | Status |
|-----------|---------|-------|------|------|-------------|-------|--------|
| JOIN_01_Detail | 조인 상세 | Venue/Explore | Apply/Profile/Venue | Guest/User | OPEN+variants | C/E | NEEDS_UPDATE |
| JOIN_STATE_* | Detail CTA variants | — | — | Host/Part | Open/Full/Applied/… | notes+samples | MISSING |
| JOIN_APPLY_01_Confirm | 참가 확인 Overlay | Detail CTA | Applied | Participant | confirm | C | IMPLEMENTED (JOIN_02) |
| JOIN_APPLY_02_Applied | 신청 완료 | Confirm | MyJoin/Detail | Participant | pending approval | C | MISSING |
| JOIN_APPLY_03_CancelConfirm | 참가 취소 확인 | Status | Cancelled | Participant | confirm | J | MISSING |
| JOIN_DAY_01_Upcoming | 당일 예정 | MyJoin | Venue/Status | Both | upcoming | C/D | MISSING |
| JOIN_DAY_02_InProgress | 진행 중 | MyJoin | Settlement | Both | in_progress | D | MISSING |

## CREATE

| Screen ID | Purpose | Status |
|-----------|---------|--------|
| CREATE_01~07 | Venue→Done wizard | IMPLEMENTED |
| CREATE_REWARD_InsufficientBalance | Coin 부족 (구매 없음) | MISSING |

## MY JOIN / HOST / PARTICIPANT

| Screen ID | Purpose | Status |
|-----------|---------|--------|
| MY_JOIN_01_Home | 만든/참가한 조인 탭 | MISSING |
| HOST_01_Manage | 방장 관리·승인 | NEEDS_UPDATE |
| HOST_02_Settlement | 참가자별 정산 | NEEDS_UPDATE |
| HOST_CANCEL_01_Confirm | 조인 취소 확인 | MISSING |
| PARTICIPANT_01_Status | 참가 상태 | NEEDS_UPDATE |
| PARTICIPANT_02_RewardPending | 보상 대기 | IMPLEMENTED |
| PARTICIPANT_CANCEL_01_Confirm | 참가 취소 | MISSING |
| SETTLEMENT_PAY_Confirm | 지급 Confirm Overlay | MISSING |
| SETTLEMENT_03_AutoPaid | Auto Pay 완료 | IMPLEMENTED |
| REPORT_01_Problem | 신고 | IMPLEMENTED |
| REPORT_02_Confirm | 신고 확인 | MISSING |
| REPORT_03_Submitted | 신고 접수·DISPUTED | MISSING |
| REWARD_01_Paid | 지급 완료 | MISSING |
| REWARD_02_AutoPaid | (=SETTLEMENT_03 or alias) | IMPLEMENTED |
| REWARD_03_Disputed | Dispute 상태 | MISSING |
| REWARD_04_Refunded | 환불 개념 | MISSING (POLICY_TBD label OK) |

## MY / PROFILE / WALLET / NOTI

| Screen ID | Purpose | Status |
|-----------|---------|--------|
| USER_01_PublicProfile | 공개 프로필 | IMPLEMENTED |
| MY_01_Home | Dashboard | IMPLEMENTED |
| MY_02_EditProfile | 공개 프로필 수정 | IMPLEMENTED |
| MY_03_Account | Social links | IMPLEMENTED |
| MY_04_Wallet | Wallet foundation | IMPLEMENTED |
| MY_05_NotificationSettings | 알림 설정 Concept | MISSING |
| MY_06_Legal | 약관·개인정보 | MISSING |
| MY_07_Withdraw | 탈퇴 진입 | MISSING |
| NOTIFICATION_01_List | 알림 목록 | MISSING |

## COMMON STATES

| Screen ID | Purpose | Status |
|-----------|---------|--------|
| COMMON_Empty_* | Empty states board | MISSING |
| COMMON_Loading | Loading | MISSING |
| COMMON_Error_Network | Network + Retry | MISSING |
| COMMON_Offline | Offline banner/screen | MISSING |
| COMMON_JoinNotFound | 404 | MISSING |

## FUTURE (이번 Phase 제외)

Shop, Coin 구매, Chat, Vendor OAuth UI, NICE 실화면, Admin, Multi-sport UI

---

## Navigation

Bottom Nav: 홈 / 탐색 / 만들기 / 내 조인 / MY  
Wallet = MY → Wallet (nav 아님)

## Consistent Mock Data (Prototype)

| Field | Value |
|-------|-------|
| Host | 김진우 · 남성 · 30대 · Verified |
| Venue | SG골프 거제점 |
| Schedule | 오늘 13:00 |
| Players | 총 4명 |
| Reward | 20 Coin / 참가자 |
| Est. End | 17:00 (= 13:00 + 4×60m) |
| Participant | 골프왕77 |
