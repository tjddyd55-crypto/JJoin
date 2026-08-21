# Phase 3A Report — Auth / Identity Gate / User Profile Vertical Slice

> Date: 2026-08-21  
> Mock providers only. Architecture Ports preserved for production adapters.

## 1. Auth State Architecture

```
BOOTSTRAPPING
UNAUTHENTICATED
AUTHENTICATED_NEEDS_TERMS
AUTHENTICATED_PROFILE_INCOMPLETE
AUTHENTICATED_IDENTITY_UNVERIFIED  ← browse OK, gate on create/join/coin
READY
```

Resolver: `packages/domain` → `resolveAuthAppState(me, hasSession)`  
Session token: Expo SecureStore via `SecureSessionStore` port (no localStorage)

## 2. 신규 / 기존 사용자 Flow

| Scenario | DEV toggle | Path |
|----------|------------|------|
| NEW_USER | Login DEV chip | Login → Terms → Identity → Profile Setup → Photo → Home |
| RETURNING_USER | Login DEV chip | Login → Home (READY) |

Identity “나중에” → Profile/Home as **IDENTITY_UNVERIFIED** for Gate QA.

## 3. Identity Gate Return Flow

Create/Apply → `requestGatedAction(intent)` → `/auth/gate`  
→ Identity (`?return=gate`) → success → Gate consumes `PendingActionIntent` → `pendingActionRoute`

## 4. Public vs Private Profile DTO

- `PublicUserProfileDto` — nickname, avatar, badge, genderDisplay, ageBand, region, bio, sportProfiles, participationCount
- `PrivateIdentityDto` — verificationStatus, verifiedAt, provider  
Deny-list test ensures phone/CI/DI/etc. never on public DTO.

## 5. API (Mock In-Memory)

| Method | Path |
|--------|------|
| POST | `/auth/social/mock-sign-in` |
| GET | `/auth/session` |
| POST | `/auth/logout` |
| GET | `/me` |
| POST | `/me/terms` |
| POST | `/me/profile/setup` |
| PATCH | `/me/profile` |
| POST | `/me/profile/avatar` |
| GET/POST | `/me/identity-status`, `/me/identity/start|confirm|cancel` |
| GET | `/users/:id/public-profile` |
| GET | `/me/wallet/summary` |
| PATCH | `/me/sport-profiles/:sportCode` |

Store: `apps/api/src/mock/mock-user.store.ts` (Postgres optional for this slice)

## 6. Mobile Screens

AUTH_01~05, AUTH_GATE, USER_01, MY_01~04 (Wallet foundation)  
Routes under `app/auth/*`, `app/my/*`, `app/user/[userId]`

## 7. Design System

Added: `ScreenContainer`, `FormField`, `ProfileChip`, `BottomActionBar`

## 8. Mock Adapters

`MockKakao/Naver/GoogleAuthAdapter`, `MockIdentityAdapter`, `MockMediaAdapter`  
Screens call Session/API only — no inline mock users.

## 9. Validation / Test

- Domain auth + public DTO + duration tests: pass
- Validation profile/terms tests: pass
- `pnpm --filter @jjoin/api build`: pass
- mobile/api/design-system typecheck: pass

## 10. Responsive QA

Figma baseline 390; layout uses tokens + flex wrap for options.  
Recommend device check: 360 / 390 / 430 for Auth/MY (manual).

## 11. POLICY_TBD

Coin UX numbers remain mock; LEGAL_TBD on terms; nickname policy; Account Linking; Identity vendor; Gate final scope.

## 12. Next Vertical Slice

**Home / Explore Map Mock → Venue Detail → Join Detail (read) → Apply with Gate**

Wallet/Settlement business logic still deferred.
