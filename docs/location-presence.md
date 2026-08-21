# Location Presence (PHASE D)

## Principles

- **OS Location Permission** ≠ **Presence sharing**
- Presence is **opt-in** (“지금 조인 가능”)
- **Exact GPS never** in public Client responses
- **No location history** table in MVP (overwrite current row only)
- **No continuous background GPS**
- Logout → Presence **HIDDEN** (safe default)

## Domain

`UserPresence` (Prisma model + in-memory store for mock-auth Phase D)

- visibility: `HIDDEN` | `AVAILABLE`
- availableUntil
- actual lat/lng (server-only)
- accuracyMeters
- lastLocationAt

## APIs

| Method | Path | Notes |
|--------|------|-------|
| GET | `/me/presence` | PrivatePresenceDto |
| PUT | `/me/presence` | lat/lng/accuracy/duration |
| DELETE | `/me/presence` | HIDDEN |

Duration UX: `1h` / `2h` / `today` → minutes via `presenceConfig` (POLICY_TBD for product copy).

## Nearby public DTO

`PublicNearbyUserDto` includes `displayLat` / `displayLng` only.

Stable privacy jitter:

1. Hash `userId` → angle + meters offset (80–150m)
2. Snap to coarse grid (~0.0005°)
3. Deterministic → markers do not jump per request

## Query filters

- visibility=AVAILABLE
- availableUntil > now
- freshness window
- distance ≤ radius (config)
- self excluded

## PostGIS

Schema notes in `prisma/migrations/0002_user_presence/notes.sql`.

MVP nearby uses **Haversine** in `UserPresence`/Explore repository layer so local Postgres without PostGIS still works.

When PostGIS is available in target envs: enable extension + GIST geography as documented.

## Storage note (Phase D)

Auth is still **mock in-memory**. Presence therefore uses `MemoryPresenceStore` so Explore works without requiring Prisma `users` rows.

Prisma `UserPresence` is the long-term SSOT for when auth persists users.
