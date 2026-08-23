# JJOIN Production Migration / Auth Recovery Report

Date: 2026-08-24 (KST)

## Root Cause

- **missing column:** `users.push_notifications_enabled`
- **migration:** `0006_push_notifications`
- **production migration status (before):** 5 applied, **0006 pending**
- **why login failed:** API Prisma Client expected Phase R columns/tables; Production Postgres never received `migrate deploy`. Social exchange / mock sign-in / `user.create|findFirst` all 500.

**Why pending:** `railway.json` had healthcheck/restart but **no `preDeployCommand` for `prisma migrate deploy`**, despite docs claiming it. Code deploys advanced schema without applying SQL.

## Migration

| Item | Result |
|------|--------|
| 0006 present in repo | yes |
| destructive DROP | none |
| ADD COLUMN | `BOOLEAN NOT NULL DEFAULT true` (safe for existing rows) |
| tables | `push_devices`, `notifications`, `notification_outbox` + enums/FKs |
| deploy | `railway ssh --service api` → `pnpm exec prisma migrate deploy` |
| post-status | **Database schema is up to date!** |

## Database

| Object | Status |
|--------|--------|
| `push_notifications_enabled` | applied via 0006 |
| PushDevice (`push_devices`) | applied (POST `/me/push-devices` → 201) |
| AppNotification (`notifications`) | applied |
| NotificationOutbox (`notification_outbox`) | applied |

## API

| Check | Result |
|-------|--------|
| GET `/health` | 200 `database: connected` |
| GET notifications meta | 200 `ready` / `provider: expo` |
| previous Prisma error | `push_notifications_enabled` does not exist (pre-deploy logs) |
| current | DEV mock sign-in **201**; push-device **201**; no new schema-miss errors on those paths |

## Auth E2E

| Path | Result |
|------|--------|
| DEV persona (DEV_A/DEV_B mock) | **PASS** (201 + session) |
| Kakao actual | **USER_ACTION** — device online; OAuth consent requires human; schema blocker removed |
| Naver / Google actual | same — try after Kakao; no OAuth config changed |

## Settlement Cron

| Check | Result |
|-------|--------|
| notification table missing | pre-fix enqueue warn; tables now exist |
| latest runs | `scanned:0 processed:0` (no due rows); no new table-missing lines in recent window |
| accounting | unchanged / exactly-once keys intact |

## Git

| Item | Result |
|------|--------|
| migration rewrite | **none** |
| code change | `railway.json` add `preDeployCommand: prisma migrate deploy` (prevent recurrence) |
| commit / push | pending with this hotfix |

## Result

**PASS** (schema + mock auth + push-device schema path)

Actual Kakao/Naver/Google OAuth consent: confirm on device (schema no longer blocks).

## Follow-up (not this hotfix)

- Firebase SA key / FCM V1 / tray push E2E
- Device tap Kakao → complete OAuth once to fully close social E2E box
