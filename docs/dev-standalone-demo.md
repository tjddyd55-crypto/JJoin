# DEV-ONLY standalone demo 통합 브랜치

**이 브랜치(`dev/standalone-demo`)는 Production `main`에 머지하지 않습니다.**

PR #36(EAS Update + `development-standalone`)과 PR #35(DEV 데모 클라이언트/시드)를 Metro 없이 같은 DEV 경험을 보여 줄 standalone APK용으로만 묶습니다. Production deploy / migrate / OTA / APK / demo seed는 하지 않습니다.

## 포함한 것

- EAS Update 채널 격리 + `development-standalone` 프로필 (PR #36)
- 홈 discover SCREEN+FIELD 병렬 fetch
- DEV clubs UI 게이트 OFF (`clubsUiEnabled` 기본 false)
- DEV 더미 유저 / photoreal 프로필·매장·배너 에셋 + fail-closed 시드 툴링 (PR #35)
- `development` 프로필은 그대로 Metro Dev Client (`developmentClient: true`)

## 빌드 (Metro-free standalone DEV APK)

```bash
cd apps/mobile && npx eas-cli build --profile development-standalone --platform android --non-interactive
```

| | `development` | `development-standalone` |
|---|---|---|
| package | `com.jjoin.app.dev` | `com.jjoin.app.dev` |
| name | 쪼인존 DEV | 쪼인존 DEV |
| channel | development | development |
| developmentClient | true | **false** |
| expo-dev-client plugin | 포함 | **미포함** |
| API | Development Railway | Development Railway |
| `EXPO_PUBLIC_USE_DEV_CLIENT` | (unset) | `false` |

## 하지 말 것

- `main` / Production 머지
- Production `eas update` / EAS production 빌드
- Production DB에 investor demo seed
- `development` Dev Client 프로필 용도 변경
