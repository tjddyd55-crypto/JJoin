# Production DB cleanup (manual ops)

**Purpose:** Remove test user/join/coin/store data from production while preserving GolfFacility master, admin credentials, system masters, and `_prisma_migrations`.

**Never automate.** Do not wire into deploy, cron, postinstall, or CI.

## Scripts

| Script | Role |
|--------|------|
| `scripts/ops/production-db-audit.ts` | Read-only row counts |
| `scripts/ops/production-db-cleanup.ts` | Selective delete with guards |

## Prerequisites

1. Railway production Postgres SSH tunnel (local port forwarded).
2. `DATABASE_URL` set to the tunnel URL (host is typically `127.0.0.1`).
3. Backup / restore plan documented before any execute run.

## Audit (read-only)

```bash
pnpm exec tsx scripts/ops/production-db-audit.ts --via-railway-tunnel
```

## Cleanup dry-run (default)

```bash
pnpm exec tsx scripts/ops/production-db-cleanup.ts --via-railway-tunnel
```

Prints preserve snapshot, delete plan, and totals. **No mutations.**

## Cleanup execute (destructive)

All flags required:

```bash
pnpm exec tsx scripts/ops/production-db-cleanup.ts \
  --via-railway-tunnel \
  --execute \
  --confirm-production \
  --confirm-phrase=JJOINZONE_PRODUCTION_CLEANUP
```

## Guards

- Default mode: **DRY RUN**
- Local `DATABASE_URL` requires `--via-railway-tunnel`
- Execute requires `--confirm-production` and exact confirmation phrase
- Transaction with post-run assertions: GolfFacility count, admin credential count, migration count unchanged
- GolfFacility fingerprint: abort if count below expected master threshold

## Preserved

- `golf_facilities`, `public_golf_facility_sync_runs`
- `sports`, `sport_rules`, `coin_assets`
- `admin_login_credentials` + linked admin user
- `_prisma_migrations`

## Not preserved (deleted for non-admin test data)

Users, social accounts, joins, coin transactional rows, stores, test venues, notifications, etc.
