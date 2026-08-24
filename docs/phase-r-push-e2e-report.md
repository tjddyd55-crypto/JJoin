# Phase R Push E2E Report

Date: 2026-08-24  
Device: R3KL202KGHF (SM-S931N)  
Package: `com.jjoin.app`  
API: `https://api-production-2d67e.up.railway.app`

## Preconditions completed

| Step | Result |
|------|--------|
| FCM V1 service account → EAS Credentials | PASS (uploaded earlier; secret not in git) |
| EAS `projectId` + `googleServicesFile` | PASS (config verified; `googleServicesConfigured: true`) |
| Clean prebuild + Dev Client rebuild + install | PASS |
| `POST_NOTIFICATIONS` | granted |
| ExpoPushToken 발급 | PASS (device) |
| PushDevice 서버 등록 | PASS (`GET /me/push-devices` active≥1) |

## Android actual tray push

| Scenario | Result | Evidence |
|----------|--------|----------|
| Apply → Host tray | **PASS** | `TRAY_HIT Apply→Host`; shade `새 참가 신청` |
| Approve → Participant tray | **PASS** | `TRAY_HIT Approve→Participant` |
| Manual Reward → Participant tray | **PASS** | `TRAY_HIT ManualReward→Participant` |
| AutoPay 중복 push 없음 | **PASS** | autopay processed 1 → 0; join 기준 `REWARD_AUTO_PAID` **1건** (`eventKey=settlement:{id}:reward_paid`) |
| Notification Center | **PASS** | Host center `새 참가 신청` HIT |
| Tray tap routing | **PASS** | shade tap → Join detail (`Phase R Tray E2E`) |

Scripts: `scripts/phase-r-android-tray-e2e.ts`, `scripts/phase-r-autopay-dup-check.ts`

## Auth / Map regression

| Item | Result |
|------|--------|
| 카카오로 시작하기 | PASS (login screen + mock DEV_A) |
| 네이버로 시작하기 | PASS (버튼 노출) |
| Google로 시작하기 | PASS (버튼 노출) |
| Kakao Map (탐색) | PASS (지도·마커·주변 리스트 렌더) |

## Result

**Phase R PASS** — 실제 Android tray 수신과 Apply / Approve / ManualReward / AutoPay(중복 없음) / Notification Center·tap routing / 소셜·맵 회귀까지 확인.

## Notes

- SA JSON / FCM 키 내용: 출력·커밋하지 않음.
- NICE / Coin Purchase / PG / IAP: 범위 외 (미착수).
