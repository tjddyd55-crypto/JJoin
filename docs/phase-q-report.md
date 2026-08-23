# Phase Q Report — Real Venue Activation + Join Creation

## Summary

Kakao Live Explore 장소에서 **사용자 선택 활성화**로 JJOIN Venue를 만들고,
그 Venue에서 Join Create가 가능하도록 연결했다.

## Architecture

- Kakao Live Venue: ephemeral Explore hit (`source=KAKAO_LOCAL`)
- JJOIN Venue: Postgres `(provider, providerPlaceId)` unique
- Activation: `POST /venues/activate` + server Kakao resolve
- Explore merge: batch lookup → `jjoinVenueId` / `openJoinCount` / `canCreateJoin`

## Kakao Policy

- Documented in `docs/kakao-venue-persistence-policy.md`
- Persist: placeId + placeUrl + user-selected operational snapshot
- No raw Kakao payload / no crawl

## Result

Code complete on `main` (pending Railway deploy + Android E2E confirmation).

## STOP

Do not start: Push, NICE/KCB/PASS, Coin Purchase, PG/IAP.
