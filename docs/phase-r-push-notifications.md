# Phase R — Push Notification Foundation

## Goal

Join / Settlement / Dispute 핵심 이벤트를 **도메인 성공과 분리된** Push side-effect로 전달한다.
Push 실패가 Apply / Approve / Pay / Dispute resolve를 rollback하면 안 된다.

## Architecture

```
Business COMMIT
  → NotificationEventService.enqueueSafe (AppNotification + Outbox, eventKey unique)
  → NotificationDeliveryService.kick (fire-and-forget)
  → ExpoPushNotificationProvider.sendPush
```

| Layer | Role |
|-------|------|
| Kakao Live / Join / Settlement | business only |
| `NotificationEventService` | idempotent enqueue |
| `NotificationOutbox` | PENDING → SENT / FAILED |
| `NotificationDeliveryProvider` | Expo (default) / null (tests) |
| `PushDevice` | multi-device token, unique `pushToken` |

## API

| Method | Path | Auth |
|--------|------|------|
| POST | `/me/push-devices` | yes |
| GET | `/me/push-devices` | yes (token never returned) |
| DELETE | `/me/push-devices/:id` | yes |
| POST | `/me/push-devices/deactivate-current` | yes |
| GET | `/me/notifications` | yes |
| POST | `/me/notifications/:id/read` | yes |
| POST | `/me/notifications/read-all` | yes |
| GET/PATCH | `/me/notification-preference` | yes |
| POST | `/notifications/deliver-pending` | cron secret |

## Events

| Type | Trigger |
|------|---------|
| JOIN_APPLICATION_RECEIVED | Apply 성공 → Host |
| JOIN_APPLICATION_APPROVED | Approve 성공 → Participant |
| SETTLEMENT_CONFIRMATION_REQUIRED | HELD→PENDING (once / settlement) → Host |
| REWARD_PAID / REWARD_AUTO_PAID | Pay 성공 → Participant (`eventKey` settlement 단위) |
| DISPUTE_OPENED / DISPUTE_RESOLVED | Issue / Admin resolve |

## Expo / FCM

- Expo SDK 57 + `expo-notifications` (dev client)
- Token: `getExpoPushTokenAsync({ projectId })`
- Server send: Expo Push HTTP API (별도 Expo access token 불필요)
- **Android production 수신에는 EAS projectId + FCM V1 credentials 필요**

### USER_ACTION_REQUIRED

1. `eas init` / Expo 대시보드에서 project 생성 → `EXPO_PUBLIC_EAS_PROJECT_ID` 설정
2. Firebase 프로젝트 + Android app `com.jjoin.app` + FCM V1 service account → EAS Credentials 업로드
3. (권장) `google-services.json` → `android.googleServicesFile`
4. `expo-notifications` plugin 반영을 위한 **dev client rebuild**
5. (선택) Railway에서 `POST /notifications/deliver-pending` 주기 호출 — 신규 cron service는 필수 아님 (enqueue 직후 kick 존재)

## Security

- push token: API list/response/profile에 미포함, 로그 mask
- deep link: `joinId` allowlist만
- logout: current token deactivate
- account switch: same token → ownership upsert

## Retention

Notification history 무한 증가 — **POLICY_TBD** (delete cron 없음)

## Env

| Name | Where | Notes |
|------|-------|-------|
| `EXPO_PUBLIC_EAS_PROJECT_ID` | mobile | required for Expo push token |
| `PUSH_PROVIDER` | api | `expo` (default) / `null` |
| `NOTIFICATION_CRON_SECRET` | api | falls back to `SETTLEMENT_CRON_SECRET` |
