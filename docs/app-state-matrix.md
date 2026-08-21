# App State Matrix (Phase 3B)

## Auth lifecycle

| State | User sees | Primary CTA |
|-------|-----------|-------------|
| UNAUTHENTICATED | Login | Social providers |
| NEEDS_TERMS | Terms | Agree & continue |
| IDENTITY pending | Verifying | Wait / Cancel |
| IDENTITY fail | Failed | Retry |
| PROFILE incomplete | Setup / Photo | Next / Skip |
| IDENTITY_UNVERIFIED (browse) | Home/Explore | Gate on create/join |
| READY | Home | Explore / Create |

## Join lifecycle (Host CTA / Participant CTA)

| Join Status | Host CTA | Participant CTA | Label |
|-------------|----------|-----------------|-------|
| OPEN | Manage / Close recruit | Apply | 모집중 |
| FULL | Manage | Waitlist? (POLICY_TBD) / disabled | 정원 마감 |
| Applied (P) | Approve/Reject | Cancel apply | 승인 대기 |
| Approved/Confirmed | Manage | Status / Cancel (policy) | 참가 확정 |
| Rejected | — | Browse other | 거절됨 |
| Closed (recruit) | Manage | — | 모집 마감 |
| CANCELLED | — | — | 취소됨 |
| IN_PROGRESS | Day view | Day view | 진행 중 |
| SETTLING | Settlement | Reward pending | 정산 중 |
| COMPLETED | Summary | Paid history | 완료 |

## Participant lifecycle

APPLIED → APPROVED/CONFIRMED → IN_PROGRESS → COMPLETED | NO_SHOW | LEFT_EARLY | CANCELLED | DISPUTED

## Reward lifecycle

HELD → PENDING_CONFIRMATION → PAID | AUTO_PAID | DISPUTED | REFUNDED

| Reward Status | Participant sees | Host sees |
|---------------|------------------|-----------|
| PENDING_CONFIRMATION | 방장 확인 대기 + auto countdown | Pay / Problem |
| PAID | 지급 완료 → Wallet | Paid badge |
| AUTO_PAID | 자동 지급 완료 | Auto note |
| DISPUTED | 검토 중 · 자동지급 중단 | Dispute submitted |
| REFUNDED | 반환 (POLICY_TBD) | Refunded |

## Wallet tx types (display)

- 조인 참가 보상
- 조인 생성 비용
- 보상 예치 (HOLD)
- 예치 반환
- 관리자 조정
