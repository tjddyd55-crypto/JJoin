# Phase K Android Settlement E2E

## Device
- adb: `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`
- device: `R3KL202KGHF`
- API: `https://api-production-2d67e.up.railway.app`
- Metro: `8081` + `adb reverse`

## Scenario A — Manual Pay
1. API: DEV_A create → DEV_B apply → approve → QA `advance-clock open`
2. Deep link `jjoin://join/{joinId}` as host
3. UI: 참가자 정산 · 박민수 · 방장 확인 대기 · countdown · [보상 지급]
4. API pay → wallet B +20, settlement PAID
5. Participant view: 지급 완료, Join COMPLETED

Screenshots:
- `docs/phase-k-android-host-pending.png`
- `docs/phase-k-android-participant-paid.png`

## Scenario B — Auto Pay
- Verified via `scripts/phase-k-settlement-smoke.ts` on production (AUTO_PAID)

## Result
**PASS**
