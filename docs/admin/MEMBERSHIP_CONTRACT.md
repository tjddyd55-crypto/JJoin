# Membership product contract (Admin readiness)

> PHASE D — Admin Membership Management is connected to Membership SSOT.

## FREE

| Item | Rule |
|------|------|
| Monthly fee | None |
| Join create | Allowed |
| Room fee | `ROOM_CREATION_FEE` debited from host wallet |
| Reward | Host holds `rewardPerParticipant × eligible slots` (`JOIN_REWARD_HOLD`) |
| Subscription row | **Not required** — resolver defaults to FREE |

## PREMIUM (ACTIVE period, or CANCELLED/PAST_DUE while period covers now)

| Item | Rule |
|------|------|
| Monthly fee | Flat subscription (pricing TBD — not set in this phase) |
| Join create | Allowed during entitlement window |
| Room fee | `0` via entitlement `ROOM_CREATION_FEE_WAIVER` |
| Reward | **Same as FREE** — still host wallet hold |
| Activation | Admin only: `ADMIN_TEST` / `ADMIN_GRANT` (no PG/IAP yet) |

## Explicit non-goals

- Premium is **not** a coin mint / issuance privilege
- Premium is **not** “reward free”
- Premium is **not** “unlimited coin”
- Do **not** store `User.isPremium` boolean as SSOT

## How effective plan is resolved

1. Load subscription rows for the user
2. `pickSubscriptionForResolution` + `resolveMembershipFromSubscription` (`@jjoin/domain`)
3. UI shows **Effective Plan** from resolver — never invent FREE/PREMIUM from raw `status` alone
4. Example: `status=CANCELLED` + `currentPeriodEnd` in the future → Effective **PREMIUM**, renewal **해지 예정**

## Why Premium does not mint Coin

Activation writes `Subscription` + `SubscriptionAuditEvent` only. Wallet available/held and coin supply are unchanged. Admin Coin 지급 UI와 Membership 부여 UI는 분리되어 있습니다.

## How to grant Premium (내부 QA)

1. Admin 로그인 (`DEV_ADMIN` 또는 `ADMIN_USER_IDS`)
2. **회원 관리**에서 QA user 검색 → Member Detail, 또는 **멤버십 관리** → Premium 부여
3. Plan=`PREMIUM`, 기간(일), **사유 required**
4. FormDialog → ConfirmDialog 확인 후 부여
5. Effective Plan = PREMIUM, entitlement = `ROOM_CREATION_FEE_WAIVER` (조인 생성 이용료 면제)
6. Coin Available/Held/Supply 변화 없음 확인

## How to schedule cancellation

1. Member Detail 또는 Membership Detail에서 **기간 종료 시 해지**
2. 사유 required → 확인: “현재 이용기간 종료일까지 Premium 혜택은 유지됩니다.”
3. `cancelAtPeriodEnd=true`, status=`CANCELLED`, Effective는 period end까지 PREMIUM

## Admin UI

- `/members` — Membership column (resolver plan)
- `/members/:id` — Effective / subscription / entitlements / history / audit + grant/cancel
- `/memberships` — Subscription list, filters, detail drawer, grant/cancel
- `/audit` — includes `MEMBERSHIP` events
- Permission codes: `MEMBERSHIP_VIEW` / `MEMBERSHIP_MANAGE` (nav contract; API `AdminGuard` is SSOT)
