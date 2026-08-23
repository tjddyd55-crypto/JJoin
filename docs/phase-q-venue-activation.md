# Phase Q — Venue Activation (Kakao Live → JJOIN Venue)

## Goal

사용자가 Explore에서 카카오 실시간 장소를 고르고 **「여기서 조인 만들기」** 로
JJOIN Venue를 활성화한 뒤, 그 Venue에서 Join을 생성한다.

Identity Production(NICE/KCB/PASS), Push, Coin Purchase, PG/IAP는 범위 밖.

## Architecture

| Layer | Role |
|-------|------|
| Kakao Live Venue | Explore ephemeral search hit (`source=KAKAO_LOCAL`) |
| JJOIN Venue | Postgres `venues` row, Join FK |
| `VenuesService.activate` | Server-side Kakao resolve → idempotent upsert by `(provider, providerPlaceId)` |
| Explore merge | Batch `providerPlaceId IN (...)` → `jjoinVenueId` / `openJoinCount` / `canCreateJoin` |

Controller/Screen에서 Prisma create 직접 호출 금지.

## API

`POST /venues/activate` (auth)

```json
{
  "provider": "KAKAO",
  "providerPlaceId": "...",
  "resolveHint": { "latitude": 0, "longitude": 0, "query": "스크린골프" }
}
```

- Client name/coords는 identity로 신뢰하지 않음
- Server가 Kakao Local로 동일 `providerPlaceId`를 재확인
- 동일 place 재호출 → 같은 `venueId`, `created=false`
- P2002 race → 기존 row 반환 (500 금지)

`POST /joins` — `venueId` 권장. `provider=KAKAO`면 미활성화 Venue는 `VENUE_NOT_ACTIVATED`.

## Explore DTO (Phase Q)

- `canCreateJoin=true` (Kakao live 포함)
- `activationRequired` / `isActivated` / `jjoinVenueId`
- `openJoinCount` + marker badge (activated + count > 0)

## Policy

See `docs/kakao-venue-persistence-policy.md`.

## Mobile flow

Explore sheet → 여기서 조인 만들기 → identity gate → activate → `/(tabs)/create?venueId=...`

## Out of scope

- Manual venue registration
- Venue owner claim
- NICE / Push / Coin purchase / PG/IAP
