# MEMBERSHIP SSOT REPORT — PHASE C

**Status:** `MEMBERSHIP_SSOT_READY`  
**Worktree:** `C:\workspace\jjoin-main` @ `main`  
**Date:** 2026-08-25

## Verdict

Membership / Subscription / Entitlement SSOT is live on the API. Premium grants **only** `ROOM_CREATION_FEE_WAIVER`. Coin mint on activate does **not** occur. Join preview/create resolve fee via domain resolver.

## Delivered

| Layer | Deliverable |
|-------|-------------|
| Prisma | `MembershipPlan`, `MembershipPlanEntitlement`, `Subscription`, `SubscriptionAuditEvent` + migration `0008_membership_subscription` (applied locally) |
| Domain | `packages/domain/src/membership.ts` + tests (FREE / ACTIVE / CANCELLED-in-period / expired / PAST_DUE; join coin 62 vs 60) |
| API | `MembershipModule` — `/me/membership`, admin plans/subscriptions/activate/cancel |
| Joins | Preview + create use `resolveEffectiveRoomCreationFee`; immutable `membership_snapshot` JoinOption |
| Me / Admin member | Additive `membership` on `/me` paths and `GET /admin/members/:id` |
| api-client | Membership read/activate/cancel helpers |
| Docs | `docs/membership/README.md`, updated `docs/admin/MEMBERSHIP_CONTRACT.md` |

## Local smoke (2026-08-25)

Persona `DEV_A` + admin `DEV_ADMIN` against `http://127.0.0.1:3000`:

| Check | Result |
|-------|--------|
| Default membership | `FREE`, no entitlements |
| Coin preview FREE | fee=`2`, hold=`60`, total=`62`, waived=`false` |
| Admin activate PREMIUM | `ROOM_CREATION_FEE_WAIVER`; `alreadyExists=false` |
| Idempotent `referenceId` | `alreadyExists=true` |
| Wallet after activate | available unchanged (`200`) — **no mint** |
| Coin preview PREMIUM | fee=`0`, hold=`60`, total=`60`, waived=`true` |
| Schedule cancel | status=`CANCELLED`, `cancelAtPeriodEnd=true`, still PREMIUM until period end |
| Plans seed | `FREE`, `PREMIUM` |

**SMOKE_PASS**

## Domain tests

`pnpm --filter @jjoin/domain test` — 41 pass (includes membership cases).

## Explicit non-goals (still out of scope)

- Admin Membership UI (Phase D)
- Mobile Premium UX (Phase E)
- PG / IAP billing
- `User.isPremium` flag

## Where to change next

| Need | Location |
|------|----------|
| Entitlement rules | `packages/domain/src/membership.ts` |
| Activate / expire / audit | `apps/api/src/modules/membership/membership.service.ts` |
| Fee at create time | `JoinsService` + domain fee helper |
| Admin screens | Phase D only |

## STOP

Phase C complete. **Do not auto-start** Phase D (Admin Membership UI) or Phase E (Premium UX) until explicitly requested.
