# Public Android OAuth — release signing checklist

Package (fixed): `com.jjoin.app`  
Display name: **JJOINZONE**  
Scheme (do not change for OAuth): `jjoin`

## EAS preview / public APK signing

Release certificate (EAS-managed keystore reused across 0.0.1 → 0.0.2):

| Field | Value |
|-------|-------|
| SHA-1 | `785b9882094d1e88a221466062e359c77e325e6a` |
| Kakao Android key hash (Base64 SHA-1) | `eFuYgglNHoiiIUZgYuNZx34yXmo=` |

Register these on **release** clients — debug SHA alone is not enough for public APK.

## Provider consoles

### Kakao Developers
- Platform Android: package `com.jjoin.app`
- Key hashes: debug (dev client) **and** release hash above
- Login Native App Key → EAS `EXPO_PUBLIC_KAKAO_LOGIN_NATIVE_APP_KEY`

### Naver Developers
- Android package `com.jjoin.app`
- Client ID / Secret → EAS `EXPO_PUBLIC_NAVER_LOGIN_*`
- URL scheme default `jjoinnaverlogin`

### Google Cloud
- **Android** OAuth client: package `com.jjoin.app` + release SHA-1 above
- **Web** OAuth client ID → mobile `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and Railway `GOOGLE_OAUTH_CLIENT_ID` (same audience)

## Mobile build requirements

EAS **preview** must include EXPO_PUBLIC OAuth keys (see `eas env:list --environment preview`).  
`eas.json` only forces `EXPO_PUBLIC_API_URL` + `EXPO_PUBLIC_INTERNAL_TOOLS_ENABLED=false`.

JS must use **static** `process.env.EXPO_PUBLIC_*` (see `social-auth-config.ts`) so Metro inlines values into the release bundle.

## Schedule / auth flow

Mobile → native SDK credential → `POST /auth/social/exchange` → session + `nextStep` (TERMS / PROFILE_… / Home).  
New social identity is **not** a login failure.
