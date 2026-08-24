# Phase R — EAS / FCM USER ACTION (minimized)

## Agent completed (no user action)

| Item | Status |
|------|--------|
| EAS CLI login (`tjddyd55`) | PASS |
| EAS project create `@tjddyd55/jjoin` | PASS |
| `extra.eas.projectId` in `app.config.ts` | PASS |
| `owner: tjddyd55` | PASS |
| `EXPO_PUBLIC_EAS_PROJECT_ID` in local `.env` | PASS |
| `eas.json` scaffold | PASS |
| `googleServicesFile` auto-wire when file present | PASS |
| `.gitignore` for google-services + Firebase SA JSON | PASS |
| Firebase Android / FCM V1 | **BLOCKED — USER** |
| Actual tray push E2E | pending FCM |

Dashboard: https://expo.dev/accounts/tjddyd55/projects/jjoin

## USER_ACTION_REQUIRED (Firebase only)

Do **not** paste secrets into chat. Place files on disk; agent will wire/upload.

### 1) Firebase Console — Android 앱 등록

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Use existing project **or** create one named e.g. `jjoin`
3. **Add app → Android**
4. Package name (exact): `com.jjoin.app`
5. App nickname (optional): `JJOIN`
6. Debug SHA-1 (optional but recommended for Google services):
   `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
7. Register → **Download `google-services.json`**

### 2) Place `google-services.json`

Save as:

```
apps/mobile/google-services.json
```

(Agent detects this path and sets `android.googleServicesFile` automatically.)

### 3) FCM V1 service account key

1. Firebase Console → Project settings → **Service accounts**
2. **Generate new private key** → downloads `*-firebase-adminsdk-*.json`
3. Save **outside the repo**, e.g.:
   `C:\Users\<you>\secrets\jjoin-fcm-service-account.json`
4. Tell the agent only the **local path** (not file contents)

Agent will run EAS Android FCM V1 credential upload (you may only need to confirm interactive prompts / file pick).

### Notes

- Google Sign-In OAuth client ≠ FCM. Do not reuse Web client ID as FCM credential.
- After files are in place, agent continues: prebuild → Dev Client rebuild → device install → ExpoPushToken → PushDevice → tray E2E A–E.
- NICE / Coin Purchase / PG / IAP remain out of scope.
