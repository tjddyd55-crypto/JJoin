# Phase O — Naver Production Login

## Architecture

- **Mobile** opens Naver OAuth in-app browser (`expo-web-browser`) and receives an authorization `code`.
- **Railway API** exchanges `code` + `redirectUri` using server-only `NAVER_LOGIN_CLIENT_SECRET`, then verifies profile at `openapi.naver.com/v1/nid/me`.
- **Mobile env** (never commit secrets):

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_NAVER_LOGIN_CLIENT_ID` | Naver client ID (public) |
| `EXPO_PUBLIC_NAVER_LOGIN_URL_SCHEME` | OAuth redirect scheme (default `jjoinnaverlogin`) |

| API env (server-only) | Purpose |
|-----------------------|---------|
| `NAVER_LOGIN_CLIENT_ID` | Same client ID as mobile |
| `NAVER_LOGIN_CLIENT_SECRET` | Token exchange secret — **never** `EXPO_PUBLIC_*` |

Android Naver SDK does not require a custom manifest URL scheme (unlike Kakao).

## NAVER Developers

| Item | Value |
|------|--------|
| Android package | `com.jjoin.app` |
| Download URL | `https://landing-production-0d39.up.railway.app` |
| URL scheme (iOS / console) | `jjoinnaverlogin` |
| Consent | nickname, profile image only |

After Google Play release, update NAVER download URL to Play Store listing if desired.

## Native rebuild

```powershell
cd apps/mobile
$env:ANDROID_HOME='C:\Users\tjddy\AppData\Local\Android\Sdk'
pnpm exec expo prebuild -p android --clean
pnpm exec expo run:android
```

## Smoke

```powershell
$env:API_BASE='https://api-production-2d67e.up.railway.app'
pnpm exec tsx scripts/phase-o-naver-e2e-server.ts
```

DB verify (Railway network): `scripts/phase-o-naver-db-verify.cjs`

## Security

- Naver access token: not stored in PostgreSQL; not logged.
- Client secret: mobile `.env` only — never Railway API, never git.
- Mock credential: hybrid-only with persona guard on production.

## Regression

After Naver prebuild, re-run Kakao login + Kakao Map explore. Phase F–N production smoke unchanged.

See `docs/phase-o-naver-e2e-report.md`.
