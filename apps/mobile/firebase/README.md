# Firebase Android clients (local only)

Variant-isolated `google-services.json` files. **Do not commit** real files (gitignored).

| Variant | Package | File |
|---------|---------|------|
| development | `com.jjoin.app.dev` | `firebase/google-services.development.json` |
| production | `com.jjoin.app` | `firebase/google-services.production.json` |

`app.config.ts` wires only the file for the active `APP_VARIANT`. Cross-fallback is forbidden.

## Setup

1. Create Firebase project(s) and register Android apps for each package above.
2. Download `google-services.json` into the matching path (gitignored).
3. Rebuild Dev Client / production APK when native config changes.

If files are missing, push registration is skipped and `googleServicesConfigured: false` in Expo extra — app startup is unaffected.

**Status when credentials are not provided:** `FCM_CONFIG_PENDING_CREDENTIAL`

Optional override: `GOOGLE_SERVICES_JSON` absolute path for CI/EAS secret file injection.
