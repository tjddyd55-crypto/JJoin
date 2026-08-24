# JJOIN Public Landing Page

Temporary public HTTPS landing for NAVER Developers Android **다운로드 URL**.

## App

- Package: `@jjoin/landing` (`apps/landing`)
- Stack: Vite + React + TypeScript, static `dist/` served by `serve`
- No API, DB, analytics, or form collection

## Local

```bash
pnpm --filter @jjoin/landing dev
pnpm --filter @jjoin/landing build
pnpm --filter @jjoin/landing preview
```

## Railway

| Item | Value |
|------|--------|
| Project | JJOIN |
| Service | `landing` |
| Root Directory | `apps/landing` |
| Build | `apps/landing/nixpacks.toml` (monorepo install at repo root) |
| Start | `serve dist -s` on `$PORT` |
| Health | `GET /` |

Do **not** apply root `nixpacks.toml` (API) or `prisma migrate` to this service.

## NAVER Developers

**Android → 다운로드 URL:** https://landing-production-0d39.up.railway.app

Package: `com.jjoin.app`

After Google Play release, the NAVER download URL may be updated to the Play Store listing. This landing URL can remain valid as a product page.
