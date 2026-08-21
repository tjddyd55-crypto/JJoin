# Explore Map Figma Report — PHASE A~C COMPLETE · STOP

Figma: https://www.figma.com/design/sL62yQIhgY1l0WUcksWuPo

## FIGMA

### 1. Explore Map 구조
Search Bar · Filter chips(전체/골프장/사람/오늘) · Full Map · Venue/User/Me markers · 이 지역 재검색 · 현재 위치 FAB · Bottom Sheet PEEK · Bottom Nav

### 2. Venue Marker
⛳ / ⛳ N (open Join count). Mock 6 venues.

### 3. User Marker
👤 distinct color language vs venue. Mock 4 users.

### 4. Join Count
On venue pin + sheet (“열린 조인 2”) + join preview cards (13:00 / 17:00, Reward, host).

### 5. Bottom Sheet
PEEK (주변 요약 + first venue + Presence OFF) · HALF (VenueSelected) · User sheet.

### 6. Presence UX
Privacy Confirm → Duration (1h/2h/오늘) → Active · “정확한 위치는 공개되지 않습니다.”

### 7. Search / Re-search
Search → EXPLORE_03 · Map move → EXPLORE_MapMoved_ReSearch · explicit re-search CTA.

### 8. Prototype
MAP-A~F wired (22 reactions). Playbook: `PROTO_PLAYBOOK_ExploreMap`.

### 9. Screenshot QA
EXPLORE_01 / VenueSelected / UserSelected / PrivacyConfirm — 3초 이해 가능, Screen 내 DEV NOTE 없음.

### 10. Manual Approval Pending
**YES — Present 수동 클릭 승인 대기**

---

## Visual Fix + Final UX Polish

| Item | Result |
|------|--------|
| Marker language | Venue pin ≠ User avatar presence (Selected 각각) |
| Re-search CTA | 기본 hidden · MapMoved만 표시 · 복귀 후 hidden |
| Sheet PEEK | Venue1 + Venue2 partial peek |
| Location FAB | 48×48 touch target |
| Filter | 오늘 → **오늘 조인** |
| EXPLORE_01_Map Screenshot QA | PASS |

**Explore Map UX = APPROVED** (추가 Figma 수정 중단)

## STOP

**PHASE D~G Production 미시작.**  
개발 키워드: `진행` · `개발하자`

상세: [docs/explore-map.md](./explore-map.md)
