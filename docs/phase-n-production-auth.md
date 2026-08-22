# Phase N — Production Social Auth Activation

## Architecture

- **Mobile** obtains native provider credentials only (Kakao/Naver access token, Google ID token).
- **Railway API** verifies credentials via provider adapters, upserts `SocialAccount`, issues **JJOIN session token**.
- **SecureStore** holds JJOIN token only — provider tokens are not persisted as the service session.
- **Mock auth** (`DEV_A` / `DEV_B` / `DEV_ADMIN`) remains for regression; hidden from production UI (`__DEV__` only).
- **Identity production** stays gated until NICE/KCB/PASS contract (`IDENTITY_PROVIDER=real` + adapter).

## SOCIAL_AUTH_MODE

| Mode | Mock credential | Real credential | mock-sign-in |
|------|-----------------|-----------------|--------------|
| `mock` | ✅ | ❌ | ✅ (scenario/persona) |
| `hybrid` | ✅ | ✅ | ✅ persona required in production |
| `real` | ❌ | ✅ | ❌ |
| `disabled` | ❌ | ❌ | ❌ |

**Recommended**

- Local/staging regression: `mock` or `hybrid`
- Production API with real Android OAuth: `hybrid` (smoke personas) or `real` (strict)

## Credential contract

| Provider | Mobile sends | Server verifies |
|----------|--------------|-----------------|
| Kakao | OAuth access token | `kapi.kakao.com` token info + `/v2/user/me` |
| Naver | OAuth access token | `openapi.naver.com/v1/nid/me` |
| Google | ID token | `oauth2.googleapis.com/tokeninfo` + `GOOGLE_OAUTH_CLIENT_ID` aud |
| Mock | `mock:PROVIDER:subject` | `SOCIAL_AUTH_MODE=mock\|hybrid` only |

**Forbidden:** mobile sending provider user id / profile as trusted identity.

## Mobile native modules

| Provider | Package | When enabled |
|----------|---------|--------------|
| Kakao | `@react-native-seoul/kakao-login` | `EXPO_PUBLIC_KAKAO_LOGIN_NATIVE_APP_KEY` set |
| Naver | `@react-native-seoul/naver-login` | Naver client id/secret + URL scheme |
| Google | `@react-native-google-signin/google-signin` | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (Web client ID) |

Kakao **Map** key (`EXPO_PUBLIC_KAKAO_MAP_NATIVE_APP_KEY`) is separate from Kakao **Login** key.

After adding native deps:

```bash
pnpm exec expo prebuild -p android --clean
pnpm exec expo run:android
```

## Environment inventory (names only — never commit secrets)

### Railway (`api` service)

| Variable | Purpose |
|----------|---------|
| `SOCIAL_AUTH_MODE` | `mock` / `hybrid` / `real` / `disabled` |
| `IDENTITY_PROVIDER` | `mock` or `real` (contract required) |
| `GOOGLE_OAUTH_CLIENT_ID` | Google ID token audience (Web client ID) |
| `JWT_SECRET` | JJOIN session signing |
| `DATABASE_URL` | PostgreSQL |

No separate auth microservice — auth stays on existing `api` service.

### Mobile (`apps/mobile/.env`)

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_URL` | Railway or local API |
| `EXPO_PUBLIC_KAKAO_MAP_NATIVE_APP_KEY` | Kakao Map SDK (do not break) |
| `EXPO_PUBLIC_KAKAO_LOGIN_NATIVE_APP_KEY` | Kakao Login Native App Key |
| `EXPO_PUBLIC_NAVER_LOGIN_CLIENT_ID` | Naver Login |
| `EXPO_PUBLIC_NAVER_LOGIN_CLIENT_SECRET` | Naver Login (mobile SDK init) |
| `EXPO_PUBLIC_NAVER_LOGIN_URL_SCHEME` | Default `jjoinnaverlogin` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google Sign-In (Web client ID) |
| `EXPO_PUBLIC_USE_MOCK_SOCIAL_AUTH` | `true` = force mock-sign-in in `__DEV__` |

## Identity production gate

- Real social users on production (`SOCIAL_AUTH_MODE=hybrid|real`, non-dev persona): `GET /me/identity/capability` → `UNAVAILABLE`.
- Mobile shows “본인확인 서비스 준비 중” — no fake success.
- Mock identity buttons: `__DEV__` only.

## Smoke

```powershell
$env:API_BASE='https://api-production-2d67e.up.railway.app'
pnpm exec tsx scripts/phase-n-production-auth-smoke.ts
pnpm exec tsx scripts/phase-m-auth-smoke.ts
```

## Android E2E matrix (manual + device)

See `docs/phase-n-e2e-report.md`.

## Regression

Phase F–M scripts unchanged. Kakao Map regression required after native prebuild.
