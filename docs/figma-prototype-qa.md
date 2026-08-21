# Figma Prototype QA (Phase 3B)

Figma: https://www.figma.com/design/sL62yQIhgY1l0WUcksWuPo  
Playbook: `04_Prototype` → `PROTO_PLAYBOOK_Phase3B`

## Coverage summary

| Layer | Result |
|-------|--------|
| A. VISUAL COVERAGE | PASS (3B.1 cleanup 후 DEV NOTE Present 노출 0) |
| B. PROTOTYPE COVERAGE | PASS (55+ reactions; Shop/Legacy dest=0) |
| C. CLICK-THROUGH QA | **MANUAL PENDING** — Present 실클릭은 사용자 수행 전 PASS 금지 |

Cleanup 상세: [phase3b1-cleanup.md](./phase3b1-cleanup.md)

---

## Flow results

### START A — 신규 가입
Result: **FIXED / GRAPH PASS**  
경로: Splash → Login → Terms → Identity → Verifying → Success → Profile → Photo → Location → Home  
발견: Identity 성공/실패 화면 부재 → AUTH_03A/B/C 추가  
재테스트: Reaction chain OK · Present 수동 재확인 필요

### START B — 기존 로그인
Result: **GRAPH PASS**  
Login → Home (frame-level). Present에서 소셜 CTA 개별 hotspot은 기존 Frame 내부 구조에 종속.

### START C — 참가자 (거제 출장)
Result: **GRAPH PASS**  
LocationSearch(거제) → List → Venue → (Join) → Apply Confirm → Applied → MyJoin  
정보 연속성 Mock: SG골프 거제점 / 13:00 / 20 Coin / 김진우

### START D — 방장 생성
Result: **GRAPH PASS**  
CREATE_01…07 → HOST_01 · Pay Confirm → Paid → Wallet  
Schedule/Reward P3B annotation 추가

### START E — Identity Gate
Result: **GRAPH PASS / UX NOTE**  
Gate → Identity Verifying → Success → Profile(온보딩) 또는 Join Return Intent는 Playbook/State Matrix에 명시.  
Return-to-Apply는 Gate 성공 후 JOIN_01 복귀 경로를 Present에서 추가 검증 권장.

### START F — Dispute
Result: **GRAPH PASS**  
Report → Confirm → Submitted(DISPUTED) → Settlement

### START G — Auto Pay
Result: **GRAPH PASS**  
RewardPending → AutoPaid → Wallet

### START H — MY
Result: **GRAPH PASS**  
MY / Wallet / NotiSettings / Legal / Withdraw 진입점 시각화 + 일부 Reaction

### FLOW I–N
Result: **DOCUMENTED** on `01_Flow` / `FLOW_I_to_N_Phase3B`

---

## Dead Ends / Broken / Clipping / Legacy

| Check | Result |
|-------|--------|
| Shop destinations | **0** |
| ZZ_LEGACY destinations | **0** (hotspots cleared) |
| Clipping (h≤12 + clips + text) | **0** (Card HUG fix) |
| Dead-end (intentional terminals only) | Graph상 CTA 복귀 존재 · Present 전수 미완 |

---

## Manual QA Requirement (필수 명시)

현재 에이전트 환경에서는 **Figma Present 모드로 손가락 클릭 UX를 처음부터 끝까지 실행하지 못했다.**

완료한 것:
1. Screen/State Inventory
2. Missing 시각화
3. Prototype `actions` Reaction 연결
4. Destination/Legacy/Shop 자동검사
5. Screenshot QA (Splash / MyJoin / Pay Confirm 등)
6. Clipping 잔여 0

**반드시 사람이 Present에서 START A–H를 1회 이상 Click-through 할 것.**

완료 전 체크리스트: docs/app-screen-inventory.md §최종 완료 기준 질문 YES 목록.
