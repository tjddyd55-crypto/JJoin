# App variants — Production vs Development (Android side-by-side)

## Identity

| | Production | Development |
|---|---|---|
| `APP_VARIANT` | `production` | `development` |
| name | JJOINZONE | JJOINZONE DEV |
| package | `com.jjoin.app` | `com.jjoin.app.dev` |
| scheme | `jjoin` | `jjoindev` |
| Dev Client scheme | `exp+jjoin` (shared EAS slug) | `exp+jjoin` (shared EAS slug; custom scheme `jjoindev`) |
| EAS profile | `production` / `preview` | `development` |
| Kakao Native App Key | PROD keys (`EXPO_PUBLIC_KAKAO_*` without `_DEV`) | DEV keys (`EXPO_PUBLIC_KAKAO_*_DEV` only; no fallback) |
| API | Production Railway | Development Railway |
| DB | Production Postgres | Development Postgres (isolated) |

SSOT: `APP_VARIANT` in `eas.json` profile `env` (and local shell / `.env` for Metro).

`android/` is gitignored — EAS/prebuild regenerates native project from `app.config.ts`.
Do not hand-edit package in a committed android tree.

## API

- Production / preview: `https://api-production-2d67e.up.railway.app`
- Development default / EAS: `https://api-development-e387.up.railway.app`
- Explicit `EXPO_PUBLIC_API_URL` always wins; localhost is override only

## Railway Development backend

Project **JJOIN** has a `development` environment (duplicated from production) with:

- Isolated Postgres (`api.DATABASE_URL` fingerprint ≠ production)
- API public domain: `https://api-development-e387.up.railway.app`
- Cron workers default inactive (schedule cleared / not relied on for DEV)

Never point Development API at production `DATABASE_URL`. Never overwrite production variables.

## Kakao

- Login: `social-auth-config.ts` → `kakaoLoginAppKey()` by `APP_VARIANT`
- Map: `app.config.ts` → `jjoin-kakao-map` plugin `nativeAppKey` by `APP_VARIANT`
- Development must use `*_DEV` Native App Key slots only
- Production Native App Key / key hash must not be changed for DEV work
- Native App Key values live in local `.env` (gitignored) and EAS Project env `development` (sensitive) — never commit into `eas.json`

DEV Android key hash (debug.keystore): `Xo8WBi6jzSxKDVR4drqm84yr9iU=`

## Signing (current DEV = Android debug.keystore)

| | Value |
|---|---|
| SHA-1 | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` |
| SHA-256 | `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C` |
| Kakao key hash | `Xo8WBi6jzSxKDVR4drqm84yr9iU=` |

If EAS development uses a different keystore, **add** (do not replace) that SHA/key hash on provider consoles.

## Provider console

- Kakao: separate DEV Native App Key for `com.jjoin.app.dev` (do not edit PROD key/hash)
- Naver: `com.jjoin.app.dev` registered; reuse Client ID/Secret
- Google: DEV Android OAuth client created; app code uses Web Client ID only
- Firebase/FCM: deferred
