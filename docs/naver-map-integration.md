# Naver Map Integration (PHASE D1)

Figma Explore UX approved → Production map rendering.

## Decision

| Item | Choice |
|------|--------|
| Wrapper | `@mj-studio/react-native-naver-map` (maintained, Expo config plugin, New Architecture / Fabric) |
| Native SDK | NCloud Maps (Android / iOS Dynamic Map) via wrapper |
| Expo Go | **Not supported** — Native module required |
| Runtime | Expo Prebuild + **Development Build** (`expo-dev-client`) |
| Bare RN migration | **No** — stay on Expo CNG |

## Current stack (repo)

- Expo SDK **57**
- React Native **0.86.2**
- React **19.2.3**
- New Architecture: default for this Expo/RN line (wrapper 2.x is New-Arch-oriented)

## Why this wrapper

- Actively released (2.9.x as of 2026-05)
- Official-style Expo plugin + Naver Maven repo via `expo-build-properties`
- Example apps track recent RN (0.85+)
- Avoids unmaintained legacy `react-native-nmap` forks
- Avoids WebView map (architecture forbidden)

## Android

1. Config plugin injects Client ID
2. `expo-build-properties` adds Maven: `https://repository.map.naver.com/archive/maven`
3. `npx expo prebuild -p android` then `npx expo run:android` (or EAS development profile)

## iOS

1. Same config plugin Client ID
2. `npx expo prebuild -p ios` then `npx expo run:ios` (macOS + CocoaPods)
3. Windows CI/dev host: iOS native QA = **Manual Pending**

## Credentials

Env (never commit secrets):

```
EXPO_PUBLIC_NAVER_MAP_CLIENT_ID=
```

NCloud Console → Maps → Application Client ID.

Missing client ID → app shows **Missing Map Config** state (compile still OK; map render ≠ PASS).

## Architecture in app

```
ExploreMapScreen
  → ExploreMapView (JJOIN types only)
    → MapAdapter port
      → NaverMapAdapter (@mj-studio internals only here)
```

Domain / screens never import Naver SDK types.

## Known issues / constraints

- Expo Go: map will not load — use Dev Client
- Without Client ID: native build may fail or map blank — treat as config error, not feature PASS
- Clustering: use SDK clustering when marker count grows (MVP may omit)
- Location permission ≠ Presence opt-in (separate)

## Commands

```bash
# from apps/mobile (after pnpm install at root)
pnpm exec expo prebuild -p android
pnpm exec expo run:android
pnpm exec expo start --dev-client
```

## Gate A status

| Check | Status |
|-------|--------|
| Integration approach documented | Done |
| Package wired | In progress |
| Android real-device map load | Requires Client ID + Dev Build — report separately |
| iOS real-device | Manual Pending on non-mac hosts |
