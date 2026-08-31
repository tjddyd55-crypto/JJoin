# Firebase / FCM — Push Production Gate (DEV tray)

**Status: BLOCKED — USER ACTION REQUIRED**  
Date: 2026-08-31  
Branch: `feature/push-reminders-analytics` @ `fffe24d`

## Resolved config (actual)

| Item | Development | Production |
|------|-------------|------------|
| name | JJOINZONE DEV | JJOINZONE |
| package | `com.jjoin.app.dev` | `com.jjoin.app` |
| EAS projectId | `7882917d-f3be-4832-bb62-754702a7d205` | same |
| `googleServicesConfigured` | **false** | **false** |
| google-services path | `apps/mobile/firebase/google-services.development.json` | `apps/mobile/firebase/google-services.production.json` |
| File present | **NO** | **NO** |

Prior Phase R tray PASS was on package `com.jjoin.app` only.  
`com.jjoin.app.dev` needs its own Firebase Android client + matching google-services file.

## Agent completed (waiting)

- Variant google-services SSOT in `app.config.ts` (no cross-fallback)
- gitignore for `firebase/google-services.*.json`
- Development Railway crons:
  - `attendance-reminder-cron` — `0 * * * *` → SUCCESS
  - `notification-delivery-cron` — `*/15 * * * *` → SUCCESS
- Cron HTTP smoke: reminder + deliver-pending endpoints OK

## Resume after user places files

1. Confirm files at destinations below (do not paste contents in chat)
2. Tell agent the **local path** of FCM V1 service-account JSON (outside repo)
3. Agent continues: EAS FCM upload (if needed) → DEV Client rebuild → USB install → tray E2E
