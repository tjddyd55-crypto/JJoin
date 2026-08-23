# Phase R Report — Push Notification Foundation

## Summary

Push를 domain side-effect(outbox)로 분리하고, Expo Push provider + PushDevice + in-app Notification Center 기반을 추가했다.
실제 Android tray 수신은 **EAS projectId + FCM V1** 사용자 설정 후 rebuild/E2E가 필요하다.

## Architecture

- Provider: `ExpoPushNotificationProvider` (`PUSH_PROVIDER=null` 테스트 가능)
- Outbox: `NotificationOutbox` + `eventKey` idempotency
- Delivery isolation: business COMMIT 이후 `enqueueSafe` / kick

## Remaining (explicit STOP)

- NICE / Coin Purchase / PG / IAP — 시작 금지
- Fine-grained notification preferences
- Dedicated notification-cron Railway service (optional)

## Result

**USER_ACTION_REQUIRED**
