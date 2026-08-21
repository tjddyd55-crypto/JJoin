# User Flow (SSOT) — Auth 보강본

## 0. Bottom Navigation

| Tab | 역할 |
|-----|------|
| 홈 | 피드 요약 |
| 탐색 | 지도 + 리스트 |
| 만들기 | 조인 생성 (미인증 시 Gate) |
| 내 조인 | Hosted / Participating |
| MY | My Home → Wallet / Profile / Account |

Wallet·Shop은 Bottom Nav에 없음. Shop은 Future.

---

## Flow E — 신규 가입

```
AUTH_01_Login
→ Social (Kakao/Naver/Google)
→ AUTH_02_Terms
→ AUTH_03_IdentityVerification
→ AUTH_04_ProfileSetup
→ AUTH_05_ProfilePhoto
→ HOME_01_Feed
```

기존 사용자: Login → HOME

---

## Flow F — 미인증 참가 Gate

```
JOIN_01_Detail
→ 참가하기
→ AUTH_GATE_IdentityRequired (Modal)
→ AUTH_03_IdentityVerification
→ (성공) JOIN_02_ApplyConfirm → PARTICIPANT_01_Status
```

만들기 CTA도 동일 Gate.

---

## Flow G — 프로필 확인

```
JOIN_01_Detail → Host avatar/nickname → USER_01_PublicProfile
JOIN_01_Detail → Participant row → USER_01_PublicProfile
HOST_01_Manage → Participant → USER_01_PublicProfile
PARTICIPANT_01_Status → Host → USER_01_PublicProfile
```

---

## Flow H — My Page

```
MY_01_Home → MY_02_EditProfile
MY_01_Home → MY_04_Wallet
MY_01_Home → MY_03_Account
MY_01_Home → 내가 만든/참가한 조인
```

---

## Flow A — 참가자 (기존)

```
HOME/EXPLORE → VENUE → JOIN → Apply → Status → RewardPending → Wallet
```

## Flow B — 방장 (기존)

```
CREATE_01…06 → CREATE_07_Done → HOST_01_Manage → HOST_02_Settlement
```

## Flow C — Auto Pay / Flow D — Dispute (기존 유지)

---

## JOIN Lifecycle (요약)

`DRAFT → OPEN → FULL → CONFIRMED → IN_PROGRESS → SETTLING → COMPLETED | CANCELLED`

Identity Gate는 Join status와 별개 (User.identity_status).

---

## Phase 3B Flows (I–N)

| Flow | Path |
|------|------|
| I Apply/Approve | Explore → Join → Apply → Pending → Host Approve → Confirmed |
| J Cancel | MyJoin → Cancel Confirm → Cancelled |
| K Settlement Pay | Host Settlement → Pay Confirm → Paid → Wallet |
| L Auto Pay | RewardPending → +24h → AUTO_PAID → Wallet |
| M Dispute | Problem → Report → DISPUTED → AutoPay stop |
| N Notification | Noti List → Join / Wallet / Profile |

Screen inventory: [app-screen-inventory.md](./app-screen-inventory.md)  
Prototype QA: [figma-prototype-qa.md](./figma-prototype-qa.md)
