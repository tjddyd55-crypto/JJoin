# JJOIN Local Naver Map Gate A Report

**Railway: NOT_CONFIGURED — intentional**  
**Updated:** 2026-08-21 (post Console package registration)

## Gate A Android Session (latest)

| Item | Result |
|------|--------|
| Local ENV Client ID | CONFIGURED (value not logged) |
| `expo prebuild -p android` | **PASS** |
| Native CLIENT_ID / NCP_KEY_ID meta | Present (no MISSING placeholder) |
| applicationId | `com.jjoin.app` |
| `adb devices` | **empty** |
| `expo run:android` | **SKIPPED** → `MANUAL_DEVICE_REQUIRED` |
| Dev Client / Map UI QA | **MANUAL_DEVICE_REQUIRED** |

Naver Console에서 `com.jjoin.app` 등록 완료 상태와 native package는 일치함.  
실기기/에뮬레이터 미연결로 Gate A 렌더 항목은 PASS 불가.

### 사용자 다음 一手

1. USB 디버깅 실기기 연결 또는 AVD 기동  
2. `adb devices`에 device 표시 확인  
3. `cd apps/mobile && pnpm exec expo run:android`  
4. 탐색 탭 Gate A 체크리스트 수동 확인  

---

## Prior notes

- Insurance CRM historically used **Web** Dynamic Map; JJOIN reuses same Client ID for local mobile Dev Build.
- Client Secret never copied to mobile.
- Railway / API / DB not configured for Gate A.
- Credential leak check: PASS (`.env` gitignored).
