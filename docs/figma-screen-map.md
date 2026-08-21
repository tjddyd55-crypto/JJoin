# Figma Screen Map (Phase 3B)

File: https://www.figma.com/design/sL62yQIhgY1l0WUcksWuPo

## Pages

| Page | 역할 |
|------|------|
| 00_Cover | 커버 |
| 01_Flow | Flow A–H + **I–N (Phase 3B)** |
| 02_Wireframe | **SSOT screens** (65 phone frames) |
| 03_Components | 공통 컴포넌트 |
| 04_Prototype | **Playbook only** (화면 이중 복제 금지) · `PROTO_PLAYBOOK_Phase3B` |
| 05_Notes_QA | QA · POLICY_TBD |

## Wireframe Sections (y rows)

1. **y≈0** — Discovery / Join / Create / Host / Participant / Auth / MY (기존)
2. **y≈1200** — APP/AUTH identity states / Location / MyJoin / Apply / Coin insufficient
3. **y≈2200** — Explore list·search / Venue empty / Join states·day / Cancel / Pay·Report confirm
4. **y≈3400** — Reward / Notification / MY settings / Common empty·loading·error·offline

## Key Frame IDs (Prototype starts)

| START | Frame | id |
|-------|-------|-----|
| A | APP_00_Splash | 24:2 |
| B | AUTH_01_Login | 17:2 |
| C | EXPLORE_03_LocationSearch | 24:119 |
| D | CREATE_01_Venue | 5:2 |
| E | AUTH_GATE_IdentityRequired | 17:117 |
| F | REPORT_01_Problem | 6:118 |
| G | PARTICIPANT_02_RewardPending | 6:105 |
| H | MY_01_Home | 18:2 |

## Naming notes

- `JOIN_02_ApplyConfirm` → **JOIN_APPLY_01_Confirm**
- `ONBOARDING_01_Location` → **ZZ_LEGACY_ONBOARDING_01_Location** (use `LOCATION_01_Permission`)
- ZZ_LEGACY_* · Prototype destination **0건** (P3B cleanup)

## Inventory SSOT

- [app-screen-inventory.md](./app-screen-inventory.md)
- [app-state-matrix.md](./app-state-matrix.md)
- [figma-prototype-qa.md](./figma-prototype-qa.md)
