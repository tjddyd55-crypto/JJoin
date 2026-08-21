# Railway Deployment — JJOIN API

SSOT for deploying NestJS API + PostgreSQL on Railway.

Related:

- Local auth / ADB reverse: [`docs/local-auth-connectivity.md`](./local-auth-connectivity.md)
- Gate A map QA: [`docs/gate-a-local-naver-map.md`](./gate-a-local-naver-map.md)
- Phase E summary: [`docs/phase-e-report.md`](./phase-e-report.md)
- Phase E.1 GitHub auto deploy: [`docs/phase-e1-report.md`](./phase-e1-report.md)

## Architecture

```
Android (Dev Client)
  ├─ Local: EXPO_PUBLIC_API_URL=http://127.0.0.1:3000 + adb reverse
  └─ Remote: EXPO_PUBLIC_API_URL=https://<railway-api-domain>

Railway Project: JJOIN
  ├─ Service: api  (NestJS monorepo root build via Nixpacks)
  └─ Service: Postgres
```

Map / Venue / Presence mock layers are unchanged. This doc is backend hosting only.

## Services

| Service  | Role                                      |
|----------|-------------------------------------------|
| `api`    | NestJS (`apps/api`), Prisma Client        |
| `Postgres` | Managed PostgreSQL (no PostGIS yet)     |

Do **not** add Redis / Object Storage / workers in this phase.

## Build & start (repo root)

Configured in:

- `nixpacks.toml` — install + workspace package builds + `prisma generate` + API build
- `railway.json` — start, preDeploy migration, healthcheck

Effective flow:

1. `pnpm install --frozen-lockfile`
2. Build `@jjoin/types` → `domain` → `validation`
3. `pnpm exec prisma generate --schema=prisma/schema.prisma`
4. `pnpm --filter @jjoin/api build`
5. **preDeploy:** `pnpm exec prisma migrate deploy --schema=prisma/schema.prisma`
6. **start:** `node apps/api/dist/main.js`

Never run `prisma migrate dev` on Railway.

## Environment variables (names only)

Set on **api** service:

| Name | Source | Notes |
|------|--------|--------|
| `NODE_ENV` | `production` | |
| `DATABASE_URL` | Railway reference `${{Postgres.DATABASE_URL}}` | Do not paste secrets into git |
| `JWT_SECRET` | Railway secret | Rotate via Railway UI/CLI |
| `SOCIAL_AUTH_MODE` | `mock` (current) / later `disabled` | Mock sign-in guard |
| `PORT` | Railway-managed | Do not hardcode |
| `CORS_ORIGINS` | optional CSV allowlist | Empty = permissive early-stage |

Local SSOT: repository root `.env` only. Do **not** duplicate `DATABASE_URL` in `prisma/.env` or `apps/api/.env`.

## Health check

`GET /health`

Safe response shape:

```json
{
  "status": "ok",
  "service": "jjoin-api",
  "database": "connected",
  "env": "production"
}
```

Never returns `DATABASE_URL`, passwords, or tokens.

## Local development (unchanged)

Terminal A:

```bash
pnpm --filter @jjoin/api start:dev
```

Terminal B:

```powershell
adb reverse tcp:3000 tcp:3000
# or: .\scripts\android-adb-reverse-api.ps1
```

Terminal C:

```bash
cd apps/mobile
pnpm exec expo start --dev-client
```

Mobile API URL stays `EXPO_PUBLIC_API_URL=http://127.0.0.1:3000` for device QA.

To point a Development Build at Railway temporarily, set `EXPO_PUBLIC_API_URL` to the HTTPS public URL and restart Metro (do not commit the value).

## GitHub auto deploy (Phase E.1)

| Item | Value |
|------|--------|
| GitHub repository | `tjddyd55-crypto/JJoin` |
| Branch | `main` |
| Railway Project | `JJOIN` (existing — do not recreate) |
| Service | `api` (existing — do not recreate) |
| Postgres | existing `Postgres` service; keep `${{Postgres.DATABASE_URL}}` |
| Monorepo root | repository root (shared workspace; **not** `apps/mobile`) |

Flow:

```
git push origin main
  → Railway api auto build (Nixpacks + nixpacks.toml / railway.json)
  → preDeploy: prisma migrate deploy
  → start: node apps/api/dist/main.js
  → GET /health
```

Manual upload remains available if needed:

```bash
railway up --service api --ci
```

Prefer GitHub `main` pushes for normal redeploys. Do not create a second API or Postgres service.
## Migration troubleshooting

If `migrate deploy` fails with a BOM / syntax error near the first line of SQL:

1. Ensure migration `.sql` files are UTF-8 **without** BOM
2. On the failed DB: `prisma migrate resolve --rolled-back <name>`
3. Redeploy so the container has clean SQL
4. `prisma migrate deploy`

Helper (ops only): `scripts/railway-migrate-repair.sh`

## Secret handling

- Never commit `.env`, `apps/mobile/.env`, or Railway tokens
- Never dump env in CI/deploy logs
- Never print Naver Client ID / JWT / DATABASE_URL in docs or chat

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Build fails on workspace packages | Ensure `nixpacks.toml` builds types/domain/validation before API |
| `/health` database disconnected | `DATABASE_URL` reference on api → Postgres |
| Migrations pending after deploy | Confirm `preDeployCommand` in `railway.json`; run deploy again |
| Local Prisma “conflict” env warning | Remove `prisma/.env`; use root `.env` only |
| Device cannot reach Railway | Use HTTPS URL in `EXPO_PUBLIC_API_URL`; cleartext only needed for local HTTP |
