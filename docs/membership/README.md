# Membership / Subscription / Entitlement SSOT

> PHASE C — server is the source of truth. Clients never invent FREE/PREMIUM from local flags.

## Product rules

| Plan | Room creation fee | Reward hold |
|------|-------------------|-------------|
| **FREE** (default; no Subscription row required) | Policy fee (`ROOM_CREATION_FEE`) | Unchanged |
| **PREMIUM** (ACTIVE period, or CANCELLED/PAST_DUE while `now < currentPeriodEnd`) | `0` via entitlement `ROOM_CREATION_FEE_WAIVER` | **Same as FREE** |

### Explicit non-goals

- Premium is **not** coin mint / issuance
- Premium is **not** “reward free”
- Do **not** use `User.isPremium` as SSOT

## Domain resolver

- Package: `@jjoin/domain` → `membership.ts`
- Entry points: `resolveMembershipFromSubscription`, `pickSubscriptionForResolution`, `resolveEffectiveRoomCreationFee`, `buildJoinMembershipSnapshot`
- Join create writes immutable `JoinOption` key `membership_snapshot`

## API

| Method | Path | Auth |
|--------|------|------|
| GET | `/me/membership` | user |
| GET | `/admin/memberships/plans` | admin |
| GET | `/admin/memberships/subscriptions` | admin |
| GET | `/admin/memberships/users/:userId` | admin |
| POST | `/admin/memberships/subscriptions` | admin activate (`ADMIN_TEST` / `ADMIN_GRANT`) |
| POST | `/admin/memberships/subscriptions/:id/cancel` | admin schedule cancel |

Activation is idempotent on `(userId, referenceId)`. No PG / IAP in this phase.

## Join accounting

- Preview / create both resolve membership server-side at call time
- `roomCreationFeeWaived` / `effectiveMembershipPlan` are additive on coin preview
- Zero fee → no `ROOM_CREATION_FEE` ledger row (existing ledger behavior)
- After period end → new creates use FREE fee; historical joins keep fee + snapshot

## Where to change later

| Change | Location |
|--------|----------|
| Entitlement semantics | `packages/domain/src/membership.ts` |
| Admin activate / expire | `apps/api/src/modules/membership/membership.service.ts` |
| Fee application at create | `JoinsService` + `resolveEffectiveRoomCreationFee` |
| Admin UI | Phase D |
| Mobile Premium UX | Phase E — `useMembership()` + MY / Membership screen / Join Create preview labels |

## Mobile UX (PHASE E)

- Access: `useMembership()` — Session `MeDto.membership` SSOT (+ `GET /me/membership` fallback)
- Do **not** invent `isPremium` or compute fee on client
- MY: MembershipBadge + MembershipSummaryCard + settings `ListRow` → `/my/membership`
- Join Create: `CoinSummaryCard` shows server `roomCreationFeeWaived` as “Premium 혜택”
- Public profile / JoinCard: no Premium badge
