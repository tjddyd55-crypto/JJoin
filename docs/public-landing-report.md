# JJOIN Public Landing Report

## Architecture
- app: `apps/landing` (`@jjoin/landing`)
- stack: Vite + React + TypeScript, static `dist/` served by `serve`
- static: SPA fallback (`serve -s`), no API/DB
- data collection: none (no analytics, forms, cookies)

## UI
- mobile: verified at 360px / 390px — no horizontal scroll
- desktop: verified at 1280px — centered card layout
- content: JJOIN intro, screen golf, feature bullets, "Android 앱 준비 중", beta notice, © JJOIN

## Build
- package: `@jjoin/landing`
- build: `pnpm --filter @jjoin/landing build` — PASS
- typecheck: included in build (`tsc -b`) — PASS

## Deployment
- provider: Railway (project JJOIN)
- service: `landing` (ID `53aefcf6-f7ef-4b72-bcc5-c10320b5769b`)
- deploy: root `nixpacks.toml` with `JJOIN_SERVICE_ROLE=landing`; `prisma migrate` scoped to `api` service only
- public URL: https://landing-production-0d39.up.railway.app
- HTTPS: yes (Railway generated domain)
- GET /: **200** (verified 2026-08-23)

## Railway Regression
- api: deployment SUCCESS (unchanged behavior when `JJOIN_SERVICE_ROLE` unset)
- settlement-cron: deployment SUCCESS

## NAVER
- Download URL: **https://landing-production-0d39.up.railway.app**
- package: `com.jjoin.app`

Google Play 정식 출시 후 NAVER Developers 다운로드 URL을 실제 Play Store URL로 변경할 수 있습니다. 이 임시 landing URL도 제품 소개 페이지로 계속 유지 가능합니다.

## Git
- commit: `03b6f16` feat: add public jjoin landing page; `fe4b151` chore: scope prisma preDeploy to api service only (and related landing deploy commits)
- push: `origin/main` up to date
- working tree: clean except untracked `apps/landing/*.tsbuildinfo` (local build artifacts)

## Result
**PASS**
