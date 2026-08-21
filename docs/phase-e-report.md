# JJOIN Phase E Report

Railway Backend Foundation + PostgreSQL + Prisma production-ready connection.

Gate A Naver Map / Explore UX code was **not** redesigned in this phase.

See also: [`docs/railway-deployment.md`](./railway-deployment.md)

---

## Gate A

- Status: **PASS** (prior Android Native QA — unchanged)
- Regression: **PASS** (no intentional Map/Explore native changes in Phase E)

## Architecture

- API: NestJS `@jjoin/api` on Railway (`node apps/api/dist/main.js`, `PORT` / `0.0.0.0`)
- DB: Railway PostgreSQL (PostGIS **not** enabled)
- Prisma: `prisma/schema.prisma` + migrations `0001_foundation`, `0002_user_presence`
- Railway: Project **JJOIN** — services `api` + `Postgres`

## Railway

- Project: **JJOIN**
- API Service: **api**
- PostgreSQL: **Postgres**
- GitHub Integration: **not linked** (local git has no remote / no commits yet)
- Deployment: **PASS** via `railway up --service api` (Nixpacks + `nixpacks.toml`)

Public API (no secrets): `https://api-production-2d67e.up.railway.app`

## Environment

- Local API: `http://127.0.0.1:3000` + ADB reverse (preserved)
- Railway API: HTTPS public domain above
- DATABASE_URL:
  - Local: root `.env` SSOT
  - Railway: `${{Postgres.DATABASE_URL}}` on `api` service
- Secret handling: duplicate `prisma/.env` / `apps/api/.env` removed; gitignore covers secrets; values not committed

## Prisma

- validate: **PASS** (root `.env` only — no duplicate env conflict)
- generate: **PASS** (local; also in Railway build)
- migrate deploy: **PASS** (Railway DB schema up to date after BOM fix + resolve)
- DB connectivity: **PASS** (`/health` → `database: connected`)

## API

- build: **PASS**
- start: **PASS** (Railway)
- health: **PASS** — `{"status":"ok","database":"connected","env":"production"}`
- public URL: `https://api-production-2d67e.up.railway.app`

## Mobile

- Local API path: `EXPO_PUBLIC_API_URL=http://127.0.0.1:3000` + ADB reverse
- Remote API path: set `EXPO_PUBLIC_API_URL` to Railway HTTPS (not hardcoded; example only in `.env.example`)
- Existing Android Dev Build regression: Map code untouched; local flow preserved

## Security

- Secrets committed: **NO**
- Mock auth guard: `SOCIAL_AUTH_MODE=disabled` blocks mock; production currently `mock` for staging/dev continuity until OAuth phase
- Env logs: no DATABASE_URL / JWT dumps in app bootstrap logs

## Validation

| Check | Result |
|-------|--------|
| prisma validate | PASS |
| prisma generate | PASS |
| API typecheck | PASS |
| API build | PASS |
| Railway `/health` smoke | PASS |
| migrate status (Railway) | up to date |
| mobile typecheck | **FAIL** (pre-existing `ExternalLink.tsx` Expo Router href typing — not introduced by Phase E) |
| unit tests | PASS (`@jjoin/domain`, `@jjoin/validation`) |

## User Action Required

1. **GitHub ↔ Railway auto-deploy**  
   Local workspace currently has **no git remote / no commits**. To enable GitHub-based redeploy:
   - Create/push the GitHub repository
   - In Railway Dashboard → `api` service → connect GitHub repo + branch
   - Prefer `railway up` until that is done

2. Optional: restart local Nest after Phase E (`pnpm --filter @jjoin/api start:dev`) if it was stopped during Prisma generate file-lock cleanup.

## Remaining

- GitHub integration / first commit+push (user/repo policy)
- Real OAuth (next Auth phase)
- Presence MemoryStore → DB vertical slice
- Venue mock → real provider
- PostGIS (deferred)

## Next

**REAL DATA VERTICAL SLICE** — Join create → Explore → participate → approve → MY JOIN on PostgreSQL.

**STOP** after Phase E foundation (this document). Do not start that slice in the same change set.
