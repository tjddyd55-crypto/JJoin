# Phase Q Report — Real Venue Activation + Join Creation

## Summary

Kakao Live Explore → **여기서 조인 만들기** → server-side Venue activate → Join Create 흐름을 완성했다.

## Architecture

- Kakao Live Venue: ephemeral Explore hit (`source=KAKAO_LOCAL`)
- JJOIN Venue: Postgres `(provider, providerPlaceId)` unique
- Activation: `POST /venues/activate` + Kakao resolve (anti-spoof)
- Explore merge: batch lookup → `jjoinVenueId` / `openJoinCount` / `canCreateJoin=true`

## Kakao Policy

See `docs/kakao-venue-persistence-policy.md`  
Persist: placeId + placeUrl + user-selected operational snapshot only. No raw payload / no crawl.

## API / DB

- `POST /venues/activate` idempotent + concurrent-safe
- `POST /joins` accepts `venueId` (Kakao requires prior activation)
- Unique `(provider, providerPlaceId)` reused

## Android E2E

- Real Kakao venue sheet CTA PASS
- UNVERIFIED identity gate PASS
- DEV_A activate → coin preview → join create PASS

## Regression

F / H / J / P server smokes PASS. Map Explore PASS.

## Git

- `b9fe683` feat: activate kakao venues for join creation
- `71feb0f` fix: restore explore peek open-join label template
- `b420a01` fix: wire requestGatedAction in explore create flow
- (+ create screen activated venue display fix)

## STOP

Do not start: Push, NICE/KCB/PASS, Coin Purchase, PG/IAP.

## Result

**PASS**
