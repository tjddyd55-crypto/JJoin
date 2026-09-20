# Mobile update runbook (Metro vs EAS Update vs APK/AAB)

JJOINZONE은 **바이너리 격리**를 깨지 않는다.

| Identity | name | package | scheme | EAS Update channel |
|---|---|---|---|---|
| Production | 쪼인존 | `com.jjoin.app` | `jjoin` | `production` |
| Development | 쪼인존 DEV | `com.jjoin.app.dev` | `jjoindev` | `development` |

SSOT: `apps/mobile/app-variant-identity.cjs` (이름/패키지/스킴), `apps/mobile/eas-update-policy.cjs` (채널/runtime).

Preview 바이너리도 Production identity이므로 **channel `production`** 을 쓴다. Development channel 을 Production/preview 바이너리에 매지 말 것.

## 네 가지를 섞지 말 것

| 경로 | 무엇인가 | 언제 | 재설치 |
|---|---|---|---|
| **Metro / Fast Refresh** | USB Dev Client가 `127.0.0.1:8082` JS를 받는다 | 로컬 개발 | 불필요 |
| **DEV OTA** | `eas update --channel development` | Metro 없이 DEV 바이너리에 JS를 밀어 넣을 때 | 불필요 (단, 아래에 적힌 네이티브 변경이면 필요) |
| **PROD OTA** | `eas update --channel production` | 스토어/preview `com.jjoin.app` 바이너리에 JS를 밀어 넣을 때 | 불필요 (같은 조건) |
| **APK / AAB** | EAS Build + (스토어) 제출 | 네이티브/권한/플러그인/applicationId 변경, 또는 `version`/`versionCode` 범프 | **필요** |

Metro가 붙어 있으면 `expo-updates` 는 비활성인 경우가 많다. **DEV OTA 검증은 Metro를 끈 DEV 바이너리**에서 한다.

## runtimeVersion

정책: `{ policy: 'appVersion' }` → runtime string 은 `app.config.ts` 의 `version` (현재 `0.0.16`).

`fingerprint` 를 쓰지 않는 이유:

- 이 레포는 스토어 바이너리마다 `version` / `versionCode` 를 이미 SSOT로 올린다.
- fingerprint 는 lockfile/plugin 노이즈에도 runtime 이 바뀌어 **JS-only 핫픽스인데 바이너리 재빌드**가 강제된다.
- `[A] JS` vs `[C] native` 운영 규칙과 충돌한다.

네이티브 인터페이스가 바뀌면 `version` 을 올리고 **새 바이너리**를 만든 뒤에만 그 버전으로 OTA 한다.

채널과 `updates.requestHeaders['expo-channel-name']` 이 DEV/PROD 를 한 번 더 가른다. 같은 runtime(`0.0.16`)이어도 **채널이 다르면 상대 바이너리에 적용되지 않는다.**

## 명령

레포 루트:

```bash
# 변경이 네이티브인지 먼저 본다
pnpm update:prepublish-check

# DEV channel 만 publish (EAS 로그인 필요)
pnpm update:dev

# Production channel — 기본 DRY-RUN. 실제 publish 금지 기본값
pnpm update:prod
```

`apps/mobile` 에서도 동일 스크립트 이름을 제공한다.

### DEV publish (operator)

```bash
cd apps/mobile
npx eas-cli update --channel development --message "dev ota <why>" --non-interactive
```

또는 루트에서 `pnpm update:dev`. Cloud Agent / CI 에 EAS 토큰이 없으면 위 명령을 로컬에서 실행한다.

**이 작업은 Production channel 에 `eas update` 하지 않는다.**

### Production publish (아직 하지 말 것)

첫 Production OTA 는 **운영자 승인 후** 로컬에서만:

1. `git` clean, branch `main`
2. `pnpm update:prepublish-check` → `OTA_SAFE`
3. `APP_VARIANT` 가 `development` 가 아님
4. 아래를 **둘 다** 켠다

```bash
EAS_UPDATE_ALLOW_PRODUCTION=1 pnpm update:prod --i-know-this-publishes-production
```

가드가 막으면 우회하지 말 것. `--dry-run` 만으로 명령을 확인한다.

## 채널 매핑

`apps/mobile/eas.json`

| build profile | APP_VARIANT | package | channel |
|---|---|---|---|
| `development` | development | `com.jjoin.app.dev` | `development` |
| `preview` | production | `com.jjoin.app` | `production` |
| `production` | production | `com.jjoin.app` | `production` |

`updates.url`: `https://u.expo.dev/<EAS projectId>`  
기본 projectId: `7882917d-f3be-4832-bb62-754702a7d205` (`app.config.ts`).

체크: `ON_LOAD` + `fallbackToCacheTimeout: 0` → 런치 블로킹 없음. 백그라운드 다운로드 후 **선택적** “다시 시작” 배너. 매 실행 강제 reload 없음.

강제 APK 게이트(`ProductionReleaseGate` / `shouldForceAndroidUpdate`) 는 OTA 와 다른 표면이다. 나중에 `minSupportedVersion` 을 넣을 자리도 **mandatory binary** 쪽이다.

## Rollback

1. [EAS Update dashboard](https://expo.dev) → 프로젝트 `jjoin` → 해당 channel.
2. 직전 그룹을 republish 하거나 그 업데이트를 다시 가리킨다.
3. 기기는 다음 콜드 스타트(또는 배너에서 다시 시작)에 롤백 번들을 받는다.
4. OTA 로 회복 불가면 이전 APK/AAB 를 재설치한다. 이건 rollback 이 아니라 **바이너리 롤백**이다.

`eas update:rollback` / dashboard republish 모두 **채널을 다시 확인**한다. development 롤백을 production 에 적용하지 말 것.

## 바이너리 재빌드가 필요한 변경

`pnpm update:prepublish-check` 가 `BINARY_REBUILD_REQUIRED` 를 내는 경로:

- `apps/mobile/android/`, `ios/` (로컬 prebuild)
- `apps/mobile/plugins/`, `modules/`
- `app.config.ts`, `app-variant-identity.cjs`, `eas.json`, `package.json`
- Firebase / Manifest / Info.plist / `app.plugin.js` / `expo-module.config.json`

대표 사례:

- 네이티브 모듈·Expo config plugin·권한 추가
- applicationId / bundle id / display name / scheme (하지 말 것 — 이미 분리됨)
- splash / adaptive icon 네이티브 에셋
- `expo-updates` **최초 도입** 포함 — 기존 설치본에는 네이티브 모듈이 없다. **OTA-capable 바이너리를 한 번 새로 빌드**해야 이후 JS OTA 가 동작한다.

JS/TS 화면, API 클라이언트, 카피만 바뀌면 OTA 또는 Metro 로 충분하다.

## 릴리스 체크리스트

### JS-only (OTA 후보)

- [ ] `pnpm update:prepublish-check` → `OTA_SAFE`
- [ ] mobile typecheck / 관련 unit test
- [ ] DEV: `pnpm update:dev` 후 Metro 없이 `com.jjoin.app.dev` 에서 확인
- [ ] MY → Internal tools → OTA debug (`jjoindev://dev/ota`) 에서 channel=`development`, runtime=`<version>`
- [ ] Production channel 명령은 실행하지 않음 (이번 셋업 기준)

### Native / store binary

- [ ] `version` + android `versionCode` 범프 (앱스토어/플레이 규칙)
- [ ] EAS `development` / `preview` / `production` 프로파일이 올바른 channel 을 갖는지 확인
- [ ] 새 바이너리 설치 후에만 그 runtime 으로 OTA
- [ ] Play Store 업로드는 이 런북의 범위가 아님

### Production OTA (운영자 승인 후에만)

- [ ] `main` + clean tree
- [ ] channel 이 `production` 인지 스크립트 로그에서 확인
- [ ] runtime / version / versionCode 로그 확인
- [ ] `APP_VARIANT=development` 및 internal-tools env 가 없음
- [ ] 첫 publish 는 수동. CI 로 production channel 을 돌리지 않음

## DEV 기기 확인 (operator)

1. EAS 로그인: `npx eas-cli whoami` (`apps/mobile`)
2. `pnpm update:dev`
3. DEV 앱을 **완전히 종료**. Metro 를 쓰지 않는다 (`adb reverse` 로 8082 가 살아 있어도 Dev Launcher 에서 Recently Opened Metro URL 을 열지 말 것).
4. `쪼인존 DEV` (`com.jjoin.app.dev`) 실행
5. `jjoindev://dev/ota` — channel / updateId / runtimeVersion / git SHA
6. Soft OTA 배너가 보이면 “다시 시작” 또는 앱 재실행
7. Production 앱 (`쪼인존`, `com.jjoin.app`) 을 열어 **같은 업데이트가 적용되지 않는지** 확인

## 구성 파일

- `apps/mobile/app.config.ts` — `runtimeVersion`, `updates.url`, `updates.requestHeaders`
- `apps/mobile/eas.json` — build `channel` + `update` profiles
- `scripts/eas-update-publish.ts` — fail-closed publisher
- `scripts/eas-update-prepublish-check.ts` — binary rebuild warning
- `apps/mobile/src/features/updates/` — soft OTA UX + DEV debug
