# Phase 3B Report — Full App UX Visualization

Figma: https://www.figma.com/design/sL62yQIhgY1l0WUcksWuPo

## 1. Screen Coverage

| Metric | Count |
|--------|-------|
| Wireframe top-level frames (after) | **65** |
| Pre-P3B frames | 32 |
| **신규** (approx) | **33** |
| **수정/Rename/Annotate** | JOIN_APPLY rename, HOME/HOST/CREATE notes, ONBOARDING→legacy, Legacy hotspot clear |
| Required Missing (inventory list) | **0** |

## 2. State Coverage

- **Auth:** Splash, Login, Terms, Identity idle/verifying/success/fail, Gate, Location allow/deny
- **Join:** State board + Day upcoming/in-progress + Apply applied/cancel
- **Participant/Host:** Manage annotate, Cancel confirms, Settlement pay confirm
- **Reward:** Paid / AutoPaid(existing) / Disputed / Refunded(POLICY)
- **Wallet/MY:** existing + Noti settings / Legal / Withdraw / Notification list
- **Common:** Empty board, Loading, Network error, Offline, JoinNotFound

## 3. Prototype

- Starting Points: A–H on Playbook + frame IDs in figma-screen-map
- Interactions wired: **55+** (button-preferring where BTN_* exists)
- Overlay: Gate/Confirms are full-screen wireframes (Overlay presentation = Present에서 Modal로 쓰는 것을 권장)
- Create wizard chain wired
- Bottom Nav: 기존 프레임 구조 유지 (신규 Concept 화면은 CTA 중심)

## 4. Click-through QA

| Flow | Result |
|------|--------|
| 신규 가입 | GRAPH PASS · Present 수동 필요 |
| 기존 로그인 | GRAPH PASS · Present 수동 필요 |
| 참가자 | GRAPH PASS · Present 수동 필요 |
| 방장 생성 | GRAPH PASS · Present 수동 필요 |
| Identity Gate | GRAPH PASS · Return Intent Present 확인 권장 |
| 승인 | DOCUMENTED (Host annotate + Flow I) |
| Settlement | GRAPH PASS |
| Auto Pay | GRAPH PASS |
| Dispute | GRAPH PASS |
| MY / Wallet | GRAPH PASS |

**C. CLICK-THROUGH = PARTIAL (Present 실클릭 미완)**

## 5. UX 문제 → 수정

| 문제 | 수정 |
|------|------|
| Identity 성공/실패 상태 없음 | AUTH_03A/B/C |
| 내 조인 Tab 없음 | MY_JOIN_01_Home |
| 지역 검색(출장) 없음 | EXPLORE_03 + List |
| Apply 이후 Dead end | JOIN_APPLY_02 + MyJoin |
| 지급 Confirm 없음 | SETTLEMENT_PAY_Confirm |
| Dispute 완료 상태 없음 | REPORT_02/03, REWARD_03 |
| Empty/Error 없음 | COMMON_* |
| Card clipping height=10 | HUG + clips=false → **0** |
| Legacy Wallet/MY hotspot | reactions 제거 → **0** |

## 6. Regression

Reaction re-audit after fixes: Shop=0, Legacy=0, Clipping=0  
Present full regression: **Manual pending**

## 7–9. Dead Ends / Broken / Clipping

Dead-end 의도 Final 제외 Graph CTA 복귀 존재 · Present 전수 미완  
Broken Shop/Legacy: **0**  
Clipping: **0**

## 10. POLICY_TBD

Coin 가치·구매, 승인 vs 즉시참가 최종, 취소 환불, Gate 최종 범위, LEGAL copy, Account linking, Withdraw, Refunded 세부

## 11. Manual QA Requirement

**Figma Present에서 START A–H 실클릭을 이 환경에서 완료하지 않음.**  
“실제 UX Click QA 완료”라고 주장하지 않는다.  
→ [figma-prototype-qa.md](./figma-prototype-qa.md)

## 12. Domain/API 피드백 (개발 전)

1. **My Joins** API/탭이 Bottom Nav에 필수 — Phase 3A에 탭만 있고 리스트 API 없음  
2. **Join apply status** (Applied/Approved) 조회 화면용 endpoint 필요  
3. **Return Intent** after Identity Gate — 클라이언트 pending action (3A 구현) ↔ UX 일치 유지  
4. **Location search vs GPS** — Venue search query에 region 분리  
5. **Insufficient coin** — create join precheck (결제 Flow 없이 에러 코드)  
6. **Notification inbox** Concept — Future push와 별개로 in-app list 스키마 검토  
7. Shop 제외 유지

## 최종 판정

- A Visual: **PASS**
- B Prototype: **PASS**
- C Click-through: **PARTIAL (Manual Present required)**

→ `Figma Full UX Phase Complete` 는 **Present 수동 QA 완료 후** 선언 권장.  
현재는 **Full Visualization + Prototype Graph Complete / Present Click Pending**.
