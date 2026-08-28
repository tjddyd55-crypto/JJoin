# JJOIN Admin — Foundation Guide

운영자(HQ) Admin 앱의 구조·규칙·확장 방법입니다.

## 1. Architecture

```
Token (styles/tokens.css)
→ Shared Components (components/*)
→ Layout (layout/AdminLayout)
→ Feature Pages (pages/*)
→ Routes (App.tsx)
```

- App: `apps/admin` (Vite + React)
- API: `apps/api` `AdminModule` + `AdminGuard`
- Client: `@jjoin/api-client`
- Types: `@jjoin/types`

소비자 앱 Club Minimal을 Admin에 복제하지 않습니다. Admin은 정보 밀도·테이블·검색·필터·감사를 우선합니다.

## 2. Auth

- 소비자 Kakao/Naver/Google OAuth와 **별도 security boundary**
- Admin UI 로그인: mock `DEV_ADMIN` persona (`/auth/social/mock-sign-in`) — local/hybrid 전용
- Production: `ADMIN_USER_IDS`에 등록된 userId만 `isAdminUser` 통과
- Session: `localStorage` `jjoin_admin_token` (Bearer)
- API SSOT: `AdminGuard` — 비관리자 `403 admin_forbidden`, 무토큰 `401 unauthorized`

## 3. Permission

`AdminPermission` enum (`@jjoin/types`)은 **future RBAC contract**입니다.

현재 런타임은 binary admin (AdminGuard)입니다. 메뉴 숨김만으로 보안을 처리하지 않습니다. 모든 `/admin/*`는 Guard 필수입니다.

| Code | 용도 |
|------|------|
| MEMBER_VIEW / MEMBER_MANAGE | 회원 |
| JOIN_VIEW / JOIN_MANAGE | 조인 |
| COIN_VIEW / COIN_ISSUE | 코인 |
| DISPUTE_VIEW / DISPUTE_RESOLVE | 분쟁 |
| VENUE_VIEW / VENUE_MANAGE | 장소 |
| MEMBERSHIP_VIEW / MEMBERSHIP_MANAGE | 멤버십 (PHASE C/D) |
| AUDIT_VIEW | 감사 |
| OPS_VIEW | 알림/운영 (future) |

## 4. Layout

`AdminLayout`: Sidebar + Header + `admin-main` (유일한 vertical scroll owner).

Page에서 sidebar/header를 다시 만들지 않습니다.

## 5. Navigation

SSOT: `src/config/navigation.ts`

- 대시보드 `/`
- 회원 `/members`
- 조인 `/joins`
- 코인 `/coin`
- 분쟁 `/disputes`
- 장소 `/venues`
- 알림/운영 `/ops` (future)
- 멤버십 `/memberships` — Subscription list / grant / cancel-at-period-end
- 감사 `/audit`

## 6. DataTable

`components/DataTable.tsx` — columns / rows / loading / empty / error / row click.

Feature마다 테이블 CSS를 새로 만들지 않습니다.

## 7. Filter

`FilterBar` + `useQueryState` — search/page/status를 URL query와 동기화.

## 8. Form

`FormField` / `SelectField` / `TextAreaField` — label / helper / error 통일.

## 9. Dialog

`ConfirmDialog` / `DangerDialog` / `FormDialog` — `window.confirm` / `alert` 금지.

위험 작업은 대상·사유·최종 확인을 명시합니다.

## 10. Status

`AdminStatusBadge` — semantic tone만 사용. raw HEX 금지 (`tokens.css` 변수).

## 11. API Client

페이지에서 raw `fetch` 금지. `lib/api.ts`의 typed `api` (`@jjoin/api-client`)만 사용.

401 → 토큰 clear → `/login`.

## 12. Audit

현재:

- CoinIssuance (`createdByUserId`, reason)
- Dispute resolution (`resolvedByAdminUserId`, adminNote)

`GET /admin/audit-events`로 통합 조회 (Coin · Dispute · Membership).

Generic event bus는 아직 없습니다.

## 13. Member

- List: nickname / userId 검색, social, identity, account, coin, **Membership (resolver)**
- Detail: profile / account / social / identity / wallet / **Membership section** (effective, entitlements, history, audit, grant/cancel)
- **금지:** CI, DI, providerSubject, fake FREE/PREMIUM

## 14. Join

Read-only list/detail — venue, host, participants, reward, holds, disputes.

## 15. Coin

기존 Production PASS API 유지 (rewrite 금지):

- `GET /admin/coin/supply`
- `GET /admin/coin/issuances`
- `POST /admin/coin/issuances`
- `GET /admin/coin/supply/reconcile`
- `GET /admin/coin/users/:userId`

Accounting identity:

```
ISSUED − BURNED = AVAILABLE + HELD
```

## 16. Membership (PHASE D)

자세한 운영 절차: [`MEMBERSHIP_CONTRACT.md`](./MEMBERSHIP_CONTRACT.md)

**FREE** — Subscription row 없음 → Effective FREE · room fee 부과  
**PREMIUM** — valid period → `ROOM_CREATION_FEE_WAIVER` · reward hold 동일 · **코인 민트 없음**

Admin:

- `/memberships` — list / filters / detail / Premium 부여 / 기간 종료 시 해지
- Member Detail Membership section — effective-first display + history/audit
- API: `AdminGuard` + `MembershipService` only (raw status 문자열 직접 수정 금지)

## 17. How To Add New Admin Page

1. `@jjoin/types`에 DTO 추가
2. `AdminGuard` 컨트롤러/서비스 추가 (`apps/api/modules/admin`)
3. `@jjoin/api-client` 메서드 추가
4. `config/navigation.ts`에 항목 추가
5. `pages/YourPage.tsx` — `PageHeader` + `DataTable`/`FilterBar` 재사용
6. `App.tsx` Route 등록
7. fake 데이터 금지 · raw HEX 금지 · raw fetch 금지

## Local run

```bash
# API
pnpm --filter @jjoin/api start:dev

# Admin
pnpm --filter @jjoin/admin dev
# http://localhost:5173
```

Login: **DEV_ADMIN** (SOCIAL_AUTH_MODE=mock|hybrid).
