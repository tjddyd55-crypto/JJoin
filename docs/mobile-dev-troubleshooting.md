# Mobile dev troubleshooting (USB / Metro)

## Quick health check

```powershell
pnpm mobile:doctor
```

Checks: Metro `:8082` `/status`, ADB device, `adb reverse` for `3000` and `8082`.

## USB ADB (default)

```powershell
adb devices -l
adb reverse tcp:3000 tcp:3000
adb reverse tcp:8082 tcp:8082
```

Use a physical device in `device` state. Do not switch to wireless unless explicitly needed.

## Start Metro (Dev Client)

```powershell
cd apps/mobile
$env:REACT_NATIVE_PACKAGER_HOSTNAME='127.0.0.1'
npx expo start --dev-client --port 8082
```

Confirm: `Invoke-WebRequest http://127.0.0.1:8082/status` → `packager-status:running`

## Connect JJOINZONE DEV

Deep link (after Metro is up):

```powershell
adb shell am start -a android.intent.action.VIEW -d "jjoindev://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8082"
```

## White screen / startup

1. Check Metro `/status` (timeout → Metro hang)
2. ADB logcat for `[BOOT 01]` … `[BOOT 08]` and first JS error
3. Dev Launcher red screen → read bundle error (often missing module / stale Metro)

## Metro hang recovery

```powershell
pnpm mobile:metro:recover
```

Only kills the process listening on port `8082`, then prints the safe restart command.

## Reload

- Dev menu → Reload, or re-open the deep link above.

## API

DEV app default API: `https://api-development-e387.up.railway.app`  
Local API exception: `adb reverse tcp:3000 tcp:3000` + `EXPO_PUBLIC_API_URL=http://127.0.0.1:3000`
