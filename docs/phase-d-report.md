# PHASE D Report — Explore Map + Presence Foundation

Figma Explore UX approved → Production implementation started.

## 1. Naver Map Integration

| Item | Value |
|------|-------|
| Wrapper | `@mj-studio/react-native-naver-map` ^2.9.0 |
| Native | NCloud Maps via Expo config plugin |
| Expo Go | **Unsupported** (expected) |
| Runtime | Expo Prebuild + **Development Build** (`expo-dev-client`) |
| Android Maven | `expo-build-properties` + Naver archive Maven |
| Config | `apps/mobile/app.config.ts` + `EXPO_PUBLIC_NAVER_MAP_CLIENT_ID` |
| Docs | [docs/naver-map-integration.md](./naver-map-integration.md) |

### Android result
**Compile/structure ready.** Real-device map render = **Manual Pending** until Client ID + `expo run:android` on device.

### iOS result
**Config ready.** Real-device QA = **Manual Pending** (macOS host required).

## 2. Architecture

- `NaverMapAdapter` — sole Naver SDK boundary
- JJOIN map types: `MapCoordinate` / `MapRegion` / …
- `VenueSearchProvider` + `MockVenueSearchAdapter` (Map ≠ Venue data)
- `ExploreService` — Venue fixtures + Join preview + nearby users
- `PresenceService` — opt-in presence (memory store + Prisma schema)

## 3. Explore Mobile

`apps/mobile/src/features/explore/`

- `screens/ExploreMapScreen.tsx`
- `map/NaverMapAdapter.tsx`
- `components/MapChrome.tsx` (search / filter / FAB 48 / re-search)
- `components/ExploreBottomSheetBody.tsx`
- Tab: `app/(tabs)/explore.tsx`

## 4. Current Location

- `expo-location` foreground only
- Permission deny → map + region search still work
- FAB 48×48 → animate to device location
- deviceLocation vs searchRegion separated

## 5. Marker

- Venue: green symbol + ⛳ join count caption
- User: blue symbol + 👤 / nickname when selected
- Me: red symbol
- Selection mutually exclusive

## 6. Bottom Sheet

`@gorhom/bottom-sheet` snap 28% / 52% / 88%

PEEK · VENUE · USER · Presence privacy/duration

## 7. Re-search

- Default **hidden**
- Camera Gesture/Control → dirty → CTA visible
- Explicit search → refresh → hidden
- No API on every pan event

## 8. User Presence

- Prisma `UserPresence` model added
- Runtime: `MemoryPresenceStore` (mock auth compatible)
- GET/PUT/DELETE `/me/presence`
- Logout → HIDDEN

## 9. Privacy

- `toPrivacyDisplayPoint` stable jitter + grid
- Public DTO deny-list for exact coords
- Docs: [docs/location-presence.md](./location-presence.md)

## 10. PostGIS

- Notes SQL prepared; **Haversine fallback active**
- PostGIS enable = env-dependent (not falsely marked PASS)

## 11. Venue + Join

- Mock Geoje venues with `openJoinCount` + joinPreviews
- Join markers not drawn separately

## 12. Venue Provider

- `MockVenueSearchAdapter` only
- Remaining: real Screen Golf place source / NCloud Place policy

## 13. Tests / Static

| Check | Result |
|-------|--------|
| `@jjoin/types` build | PASS |
| `@jjoin/api` typecheck | PASS |
| `@jjoin/api` nest build | PASS |
| `@jjoin/api-client` typecheck | PASS |
| `@jjoin/mobile` typecheck | PASS |
| privacy-location assert script | available |
| Prisma validate | blocked locally by dual `.env` DATABASE_URL conflict (pre-existing) |

## 14. Real Device QA

| Item | Status |
|------|--------|
| Naver Map load | **Manual Pending** (needs Client ID + Dev Build) |
| Pan / Zoom / Marker / Sheet | Pending device |
| Presence ON/OFF | API + UI wired; device Pending |
| Expo Go | Expected unsupported — not a FAIL |

## 15. Changed Files (core)

- `apps/mobile/app.config.ts`, `app/_layout.tsx`, `app/(tabs)/explore.tsx`
- `apps/mobile/src/features/explore/**`
- `apps/api/src/modules/explore/**`, `presence/**`
- `apps/api/src/providers/mock-venue-search.adapter.ts`
- `prisma/schema.prisma` (+ presence notes)
- `packages/types`, `packages/api-client`
- `docs/naver-map-integration.md`, `location-presence.md`, `phase-d-report.md`
- `.env.example`

## 16. Commands

```bash
pnpm install
pnpm --filter @jjoin/types build
pnpm --filter @jjoin/api start:dev

# Mobile — Development Build (not Expo Go)
cd apps/mobile
# set EXPO_PUBLIC_NAVER_MAP_CLIENT_ID in env
pnpm exec expo prebuild -p android
pnpm exec expo run:android
pnpm exec expo start --dev-client
```

## 17. Environment Variables (names only)

- `EXPO_PUBLIC_NAVER_MAP_CLIENT_ID`
- `EXPO_PUBLIC_API_URL`
- `PRESENCE_NEARBY_RADIUS_M`
- `PRESENCE_FRESHNESS_MINUTES`
- `DEFAULT_SPORT_CODE`
- `DATABASE_URL`

## 18. POLICY_TBD

- Presence duration product copy / legal wording
- Exact privacy jitter meters
- Logout presence permanence
- Real Venue Provider selection

## 19. Blockers

- **Naver Client ID missing** → cannot claim Gate A map-render PASS
- **Android device Dev Build not run in this session**
- **iOS device QA Manual Pending**
- Dual `.env` / `prisma/.env` DATABASE_URL conflict for `prisma validate`

Otherwise: architecture + Explore vertical slice foundation is in place.
