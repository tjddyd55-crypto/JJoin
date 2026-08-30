# App variants — Production vs Development (Android side-by-side)

## Identity

| | Production | Development |
|---|---|---|
| `APP_VARIANT` | `production` | `development` |
| name | JJOINZONE | JJOINZONE DEV |
| package | `com.jjoin.app` | `com.jjoin.app.dev` |
| scheme | `jjoin` | `jjoindev` |
| Dev Client scheme | `exp+jjoin` | `exp+jjoin-dev` |
| EAS profile | `production` / `preview` | `development` |

SSOT: `APP_VARIANT` in `eas.json` profile `env` (and local shell / `.env` for Metro).

`android/` is gitignored — EAS/prebuild regenerates native project from `app.config.ts`.
Do not hand-edit package in a committed android tree.

## API

- Production / preview: `https://api-production-2d67e.up.railway.app`
- Development: set `EXPO_PUBLIC_API_URL` (or `EXPO_PUBLIC_DEVELOPMENT_API_URL`) to Development API
- Localhost is explicit override only

## Signing (current DEV = Android debug.keystore)

Used for local Dev Client / until EAS development credentials differ:

| | Value |
|---|---|
| SHA-1 | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` |
| SHA-256 | `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C` |
| Kakao key hash | `Xo8WBi6jzSxKDVR4drqm84yr9iU=` |

If EAS development uses a different keystore, **add** (do not replace) that SHA/key hash on provider consoles.

## Provider console (additive only)

- Kakao: add Android `com.jjoin.app.dev` + key hash on **existing** app
- Naver: add Android `com.jjoin.app.dev` on **existing** application
- Google: create **new** Android OAuth client (`com.jjoin.app.dev` + SHA-1); keep Web client
- Firebase/FCM: deferred until FCM enabled
