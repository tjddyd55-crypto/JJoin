# Phase N — Provider Console Checklist

Package for all Android clients: **`com.jjoin.app`**

Never paste secrets into chat or commit them. Set values in Kakao/Naver/Google consoles and Railway/mobile `.env` locally.

---

## Kakao Login (MVP priority)

Console: [Kakao Developers](https://developers.kakao.com)

### Separate keys

| Product | Key type | Mobile env |
|---------|----------|------------|
| Kakao Map | Native App Key | `EXPO_PUBLIC_KAKAO_MAP_NATIVE_APP_KEY` |
| Kakao Login | Native App Key | `EXPO_PUBLIC_KAKAO_LOGIN_NATIVE_APP_KEY` |
| Local REST (server) | REST API Key | `KAKAO_LOCAL_REST_API_KEY` (Railway only) |

### Android platform

1. 앱 → **플랫폼** → Android 추가
2. Package name: `com.jjoin.app`
3. **키 해시** 등록 (debug + release)
   - Debug: `pnpm pwsh scripts/print-android-debug-keyhash.ps1`
4. **카카오 로그인** 제품 활성화
5. 동의 항목: 서비스에 필요한 최소 scope (닉네임/프로필/이메일 등)

### Redirect / scheme

- Native SDK login — no WebView arbitrary login
- App scheme `jjoin` (Expo) must not conflict with Kakao callback activities from `@react-native-seoul/kakao-login`

### Server verification

- Mobile sends **access token** only
- Railway: no Kakao secret required for token introspection (Bearer to Kakao Open API)

### USER_ACTION_REQUIRED

- [ ] Create/use Kakao Login app (or enable Login on existing app with **Login Native App Key**)
- [ ] Register debug key hash (and release hash before store build)
- [ ] Set `EXPO_PUBLIC_KAKAO_LOGIN_NATIVE_APP_KEY` in `apps/mobile/.env`
- [ ] Rebuild dev client: `expo prebuild -p android` + `expo run:android`

---

## Naver Login

Console: [Naver Developers](https://developers.naver.com)

Naver Map runtime is removed; this is **JJOIN-only** Naver Login application.

1. Application → **Android**
2. Package: `com.jjoin.app`
3. Client ID / Client Secret → mobile env:
   - `EXPO_PUBLIC_NAVER_LOGIN_CLIENT_ID`
   - `EXPO_PUBLIC_NAVER_LOGIN_CLIENT_SECRET`
4. URL scheme: `EXPO_PUBLIC_NAVER_LOGIN_URL_SCHEME` (default `jjoinnaverlogin`)

Server: verifies access token via `openapi.naver.com/v1/nid/me` (no client secret on server for this flow).

### USER_ACTION_REQUIRED

- [ ] Naver Login application + Android package
- [ ] Mobile env + native rebuild

---

## Google Sign-In

Console: [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials

Create **two** OAuth clients:

| Client | Purpose | Where |
|--------|---------|-------|
| Android | App attestation / Sign-In | Google Cloud (package `com.jjoin.app` + SHA-1) |
| Web | ID token audience for server | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` + Railway `GOOGLE_OAUTH_CLIENT_ID` |

Mobile sends **ID token** (from Web client configuration in `@react-native-google-signin/google-signin`).

Railway validates `aud` against `GOOGLE_OAUTH_CLIENT_ID`.

### USER_ACTION_REQUIRED

- [ ] Android OAuth client (SHA-1 from debug/release keystore)
- [ ] Web OAuth client ID on mobile + Railway
- [ ] Native rebuild

---

## Production Identity (NICE / KCB / PASS)

**Not in scope for Phase N social OAuth PASS** until contract exists.

| Provider | Notes |
|----------|-------|
| NICE | 휴대폰 본인확인 — 계약 + CI/DI 정책 |
| KCB | OKCert / 본인확인 — 계약 |
| PASS | 통신사 PASS — 앱 연동 + 계약 |

Selection is **USER decision** — document only until contract.

Railway: `IDENTITY_PROVIDER=real` only after Phase N.1 adapter.

---

## Railway auth mode checklist

- [ ] `SOCIAL_AUTH_MODE=hybrid` for staging smoke + real tokens
- [ ] `SOCIAL_AUTH_MODE=real` for strict production (optional)
- [ ] Confirm `POST /auth/social/mock-sign-in` blocked for arbitrary subjects in production (`mock_persona_required` on hybrid)
