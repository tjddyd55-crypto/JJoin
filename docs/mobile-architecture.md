# Mobile Architecture

## Stack

- React Native + Expo (TypeScript)
- Expo Router (file-based navigation)
- StyleSheet + `@jjoin/design-system` tokens/components
- i18n: `@jjoin/i18n`
- API: `@jjoin/api-client`

## Forbidden

- Capacitor / WebView shell as primary app
- Tailwind / NativeWind as default styling
- Arbitrary inline colors/spacing as domain of truth

## Feature Folder Pattern

```
apps/mobile/src/features/join-detail/
  api/
  model/
  hooks/          # useJoinDetail
  components/     # presentational pieces for this feature
  screens/        # JoinDetailScreen orchestration
```

Screen → Hook → View 분리.

## Bottom Navigation

홈 / 탐색 / 만들기 / 내 조인 / MY  
Wallet은 MY → Wallet.

## Auth UX (from Phase 1)

Social → (new) Terms → Identity → Profile → Photo → Home  
Identity Gate on create/join/coin actions.

## Bootstrap Scope

- App boots
- Expo Router tabs skeleton
- Design token + Button import
- i18n hello
- API client injectable config

## Phase 3A Auth Slice

- `src/session` — SessionProvider, SecureStore port, PendingActionIntent
- `src/features/auth|my|profile` — screens (presentation) + session hooks
- Routes: `app/auth/*`, `app/my/*`, `app/user/[userId]`
- DEV-only NEW/RETURNING scenario chips on Login (not production UI)

See [phase3a-report.md](./phase3a-report.md)
