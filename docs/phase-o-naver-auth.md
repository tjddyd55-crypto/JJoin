# Phase O — Naver Production Login

## Architecture

- **Mobile** obtains Naver OAuth access token via `@react-native-seoul/naver-login` only.
- **Railway API** verifies token at `openapi.naver.com/v1/nid/me` — provider `subject` is server truth.
- **No** `NAVER_CLIENT_*` on API today; verification is Bearer-only.
- **Mobile env** (never commit secrets):

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_NAVER_LOGIN_CLIENT_ID` | Naver client ID (SDK init) |
| `EXPO_PUBLIC_NAVER_LOGIN_CLIENT_SECRET` | Naver client secret (SDK init only) |
| `EXPO_PUBLIC_NAVER_LOGIN_URL_SCHEME` | Default `jjoinnaverlogin` (iOS + Naver console) |

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
