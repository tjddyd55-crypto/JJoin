# Phase G — Real Presence

## Goal

`지금 조인 가능` opt-in → Railway PostgreSQL `UserPresence` → privacy-safe Explore user markers.

## Architecture

```
PresenceService
      │
      ▼
PresenceStore (port)
   ├─ MemoryPresenceStore   (local / PRESENCE_STORE=memory)
   └─ PrismaPresenceStore   (Railway / default PRESENCE_STORE=prisma)
```

- Production: Prisma only. DB failure must fail visibly — **no silent Memory fallback**.
- Exact GPS stays server-side in `user_presences.latitude/longitude`.
- Public Explore returns `displayLat` / `displayLng` only (privacy transform).

## Lifecycle

1. User confirms privacy + duration (mobile UX unchanged).
2. Foreground location once → `PUT /me/presence`.
3. Server computes `availableUntil` from duration preset (client cannot set absolute expiry).
4. `visibility=AVAILABLE` until OFF / logout / query-time expiry.
5. `DELETE /me/presence` or logout → `HIDDEN` (row kept; coords not returned publicly).

## Duration

| Preset | Server rule |
|--------|-------------|
| `1h` | now + 1 hour |
| `2h` | now + 2 hours |
| `today` | end of calendar day in `DEFAULT_TIMEZONE` (default `Asia/Seoul`) |

Exact product copy / edge cases: **POLICY_TBD**.

## Nearby query

- No PostGIS in this phase.
- Bounding box coarse filter on lat/lng + `AVAILABLE` + `availableUntil > now` + `User.status=ACTIVE`.
- Haversine distance + radius + limit (`PRESENCE_NEARBY_LIMIT`).
- Self excluded; expired/hidden excluded at query time (no cron).

## Privacy transform

- HMAC(`PRESENCE_PRIVACY_SECRET`, `userId|privacyEpoch`) → stable jitter within a presence session.
- Epoch material includes `availableUntil` + `lastLocationAt` → new session rotates fingerprint.
- Permanent userId-only jitter **forbidden**.
- Public distance is rounded (`approxDistanceMeters`).

## Opt-in / tracking

- OS location permission ≠ Presence consent.
- No background location, continuous tracking, history, or geofencing in MVP.
- Current-location FAB remains camera-only (separate from Presence).

## Explore data sources

| Layer | Source |
|-------|--------|
| Venue | MockVenueSearchAdapter |
| Join preview | PostgreSQL (Phase F) |
| User markers | PostgreSQL UserPresence + public profile |

## One-device QA

1. Android: DEV_A ON → DB AVAILABLE → OFF/logout hide.
2. Smoke/API: re-activate DEV_A at QA coords (do not break logout-hide for convenience).
3. Android: DEV_B Explore → [사람] → see A public marker/sheet.

Script: `scripts/phase-g-presence-smoke.ts`  
(`CLEANUP=1` hides A after smoke.)

## Env

```
PRESENCE_STORE=prisma
PRESENCE_PRIVACY_SECRET=   # Railway only; never EXPO_PUBLIC / never commit
PRESENCE_NEARBY_RADIUS_M=
PRESENCE_FRESHNESS_MINUTES=
PRESENCE_NEARBY_LIMIT=
DEFAULT_TIMEZONE=Asia/Seoul
```

## Future (not this phase)

- PostGIS / GiST / `ST_DWithin`
- Actual Venue Provider
- Coin Hold / Settlement
- Real OAuth / Identity Provider
- Background location / push / chat
