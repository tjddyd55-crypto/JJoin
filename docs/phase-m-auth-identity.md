# Phase M — Social Auth & Identity Verification

## Architecture

- **SocialAccount** — unique `(provider, providerSubject)` in PostgreSQL
- **POST /auth/social/exchange** — server verifies provider credential, creates/links User, issues JJOIN session
- **POST /auth/social/mock-sign-in** — DEV personas + in-memory scenarios (unchanged for regression)
- **UserConsent** — terms/privacy/identity/location/marketing version snapshots
- **IdentityVerification** — private fields; public `/me` exposes status only
- **IdentityGate** — server enforces `CREATE_JOIN`, `APPLY_JOIN`, presence ON

## OAuth adapters

| Provider | Server verification |
|----------|---------------------|
| Kakao | `kapi.kakao.com` access token + user/me |
| Naver | `openapi.naver.com/v1/nid/me` |
| Google | `oauth2.googleapis.com/tokeninfo` (audience check via `GOOGLE_OAUTH_CLIENT_ID`) |
| Mock | `mock:PROVIDER:subject` when `SOCIAL_AUTH_MODE=mock|hybrid` |

Mobile must never send trusted identity claims — only provider credentials.

## Onboarding order

Terms → Identity → Profile → Avatar → Location → Home

Server `authAppHints` + `resolveOnboardingStep` are SSOT.

## Environment (Railway api)

| Variable | Purpose |
|----------|---------|
| `SOCIAL_AUTH_MODE` | `mock` (staging), `hybrid`, `real`, `disabled` |
| `IDENTITY_PROVIDER` | `mock` (DEV/staging) or `real` (USER_ACTION_REQUIRED until NICE/KCB/PASS contract) |
| `GOOGLE_OAUTH_CLIENT_ID` | ID token audience validation |

## Mock identity guard

Production real users cannot call mock identity unless `SOCIAL_AUTH_MODE=mock` (staging) or dev persona.

## Smoke

```bash
$env:API_BASE='https://api-production-2d67e.up.railway.app'
pnpm exec tsx scripts/phase-m-auth-smoke.ts
```

## USER_ACTION_REQUIRED — Provider consoles

Configure separately (never commit secrets):

- **Kakao Login**: [Kakao Developers](https://developers.kakao.com) → 앱 → 카카오 로그인 활성화 → Android `com.jjoin.app` + key hash (Map Native Key와 별도)
- **Naver Login**: [Naver Developers](https://developers.naver.com) → Application → Android package `com.jjoin.app`
- **Google Sign-In**: Google Cloud Console → OAuth client (Android + Web client ID for server)

Mobile: `@react-native-seoul/kakao-login` / Google Sign-In native modules when credentials are ready.
