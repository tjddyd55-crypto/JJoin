# Phase 3B.1 — Pre-Present Visual Cleanup

Figma: https://www.figma.com/design/sL62yQIhgY1l0WUcksWuPo

## 1. Screen 내부에서 제거한 DEV Annotation

| Count | Items |
|------:|-------|
| **4** | `NOTE_P3B_Home`, `NOTE_P3B_Schedule`, `NOTE_P3B_Reward`, `NOTE_P3B_Host` |

이동 위치: `05_Notes_QA` → `NOTE_P3B_DevAnnotations_Moved`

추가 UI 문구 정리 1건:
- `CREATE_04_Game`의 `SPORT_RULE/JOIN_OPTION` 개발 문구 → 사용자용 안내 문장으로 교체

Present 기준 Screen 내부 DEV/P3B 노출 잔여: **0**

## 2. 수정한 AppBar Frame

- HOME_01_Feed → `JJOIN` / `거제 · 고현` 복구
- CREATE_02_Schedule → `←` / `조인 만들기` / `2/6` / `일정 · 인원`
- CREATE_05_Reward → `←` / `조인 만들기` / `5/6` / `보상 Coin`
- HOST_01_Manage → `←` / `내가 만든 조인`

## 3. Scroll 적용/확인 Frame

overflowDirection=VERTICAL + content bottom padding:

- MY_01_Home (content + BottomNav inset 80)
- HOST_01_Manage
- HOST_02_Settlement
- AUTH_02_Terms
- AUTH_04_ProfileSetup
- MY_03_Account
- MY_05_NotificationSettings

## 4. BottomNav overlap

MY / HOST: BottomNav fixed(layoutGrow=0), content paddingBottom ≥ nav+16 → Screenshot상 가림 없음

## 5. Screenshot QA

| Frame | DEV NOTE | AppBar | BottomNav/CTA | Clipping |
|-------|----------|--------|---------------|----------|
| HOME_01 | 0 | OK | OK | 0 |
| CREATE_02 | 0 | OK | 다음 CTA OK | 0 |
| CREATE_05 | 0 | OK | 다음 CTA OK | 0 |
| HOST_01 | 0 | OK | BottomNav OK | 0 |
| MY_01 | 0 | OK | BottomNav OK | 0 |

## 6. Clipping 잔여

**0건**

## 7. Present START A–H

`04_Prototype` · `PROTO_PLAYBOOK_Phase3B` 유지. 신규 화면 추가 중단.

## 8. Manual Click Pending

**YES — Present 수동 Click-through는 사용자가 수행하기 전 PASS 아님**

최종:
- VISUAL = **PASS** (cleanup 후)
- PROTOTYPE GRAPH = **PASS**
- PRESENT CLICK = **MANUAL PENDING**
