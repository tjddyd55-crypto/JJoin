# Phase P — Google Production Login

## Architecture

- **Mobile** obtains Google **ID token** via `@react-native-google-signin/google-signin` (`webClientId` = Web OAuth client).
- **Railway API** verifies via `oauth2.googleapis.com/tokeninfo` and requires `aud === GOOGLE_OAUTH_CLIENT_ID`.
- Mobile must **not** send Google user id / email as trusted identity.

## Credential roles (do not mix)

| Client | Purpose | Destination |
|--------|---------|-------------|
| **Android** OAuth client | Play Services / app attestation (`com.jjoin.app` + SHA-1) | Google Cloud Console only |
| **Web** OAuth client | ID token audience | Mobile `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` **and** Railway `GOOGLE_OAUTH_CLIENT_ID` (same value) |

No Google client secret on mobile. Offline access / refresh token: **off** (`offlineAccess: false`).

## Env names (code truth)

| Location | Name |
|----------|------|
| Mobile | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` |
| Railway `api` | `GOOGLE_OAUTH_CLIENT_ID` |
| Mode | `SOCIAL_AUTH_MODE=hybrid` |

## Android signing (current Dev Client on device)

Package: `com.jjoin.app`  
Certificate: Android Debug (installed APK)

| Fingerprint | Value |
|-------------|-------|
| SHA-1 | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` |
| SHA-256 | `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C` |

If release/Play App Signing key changes later, update the Android OAuth client SHA list.

## USER_ACTION_REQUIRED (Google Cloud)

1. **OAuth consent screen** — External or Internal; app name JJOIN; scopes: openid / profile (email only if needed). No Contacts/Calendar/Gmail.
2. **Android OAuth client** — Application type Android; package `com.jjoin.app`; SHA-1 above (add SHA-256 if console asks).
3. **Web OAuth client** — Application type Web; copy Client ID (no secret needed for ID-token audience).
4. Set **same Web Client ID** in:
   - `apps/mobile/.env` → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - Railway `api` Variables → `GOOGLE_OAUTH_CLIENT_ID`
5. Add your Google account as a **test user** if consent screen is in Testing.
6. Do **not** paste Client IDs or tokens into chat — reply with **「설정 완료」** only.

## After credentials

```powershell
cd apps/mobile
pnpm exec expo prebuild -p android --clean
pnpm exec expo run:android
```

Then Actual Google Android E2E + Kakao/Naver/Map + F–O regression.

## Security

- ID token not stored in DB permanently
- No token logging
- No client secret on mobile
- Identity gate unchanged until NICE/KCB/PASS

See `docs/phase-p-google-e2e-report.md` after E2E.
