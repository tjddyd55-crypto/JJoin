# Domain Model (SSOT)

## 설계 원칙

1. 스크린골프 전용 핵심 테이블 금지
2. 명시적 Domain + 확장 포인트만 추상화
3. Generic JSON Engine으로 전체를 녹이지 않음
4. 코인 이동은 Ledger로 추적, 잔액은 Wallet 집계

---

## Entity 목록

| Entity | 목적 | Phase 1 |
|--------|------|---------|
| USER | 계정·상태 | ✅ |
| SOCIAL_ACCOUNT | Kakao/Naver/Google 연동 | ✅ |
| IDENTITY_VERIFICATION | 본인확인 (원문 주민번호 금지) | ✅ |
| USER_PROFILE | 공개 프로필 | ✅ |
| USER_SPORT_PROFILE | 종목별 실력 (Screen Golf) | ✅ |
| MEDIA_ASSET | 아바타 등 (실스토리지 Future) | ✅ 스키마 |
| SPORT / SPORT_RULE | 종목·규칙 | ✅ |
| VENUE | 시설 | ✅ |
| JOIN / JOIN_REQUIREMENT / JOIN_OPTION | 조인 | ✅ |
| JOIN_PARTICIPANT | 참가 | ✅ |
| REWARD_SETTLEMENT | 참가자별 정산 | ✅ |
| WALLET / COIN_ASSET / COIN_TRANSACTION / COIN_HOLD | 코인 | ✅ |
| REPORT / AUDIT_LOG | 신고·감사 | ✅ |
| PAYMENT / PRODUCT / ORDER / ORDER_ITEM | Shop·결제 | ❌ Future (Migration 제외) |

---

## Auth / Profile 관계

```
USER 1—N SOCIAL_ACCOUNT
USER 1—0..N IDENTITY_VERIFICATION
USER 1—1 USER_PROFILE
USER 1—N USER_SPORT_PROFILE
USER_PROFILE N—0..1 MEDIA_ASSET (avatar)
```

## 핵심 관계

```
USER 1—1 USER_PROFILE
USER 1—N JOIN (as host)
USER 1—N JOIN_PARTICIPANT
SPORT 1—N VENUE
SPORT 1—N JOIN
SPORT 1—1 SPORT_RULE (또는 1—N by version)
VENUE 1—N JOIN
JOIN 1—N JOIN_REQUIREMENT
JOIN 1—N JOIN_OPTION
JOIN 1—N JOIN_PARTICIPANT
JOIN_PARTICIPANT 1—0..1 REWARD_SETTLEMENT
USER 1—N WALLET (per COIN_ASSET)
WALLET 1—N COIN_TRANSACTION
WALLET 1—N COIN_HOLD
JOIN / SETTLEMENT → COIN_HOLD (ref)
USER 1—N REPORT (reporter)
JOIN_PARTICIPANT 0..1—N REPORT (subject)
```

---

## Entity 상세

### USER

| Column | Notes |
|--------|-------|
| id | UUID PK |
| status | ACTIVE / SUSPENDED / WITHDRAWN |
| identity_status | UNVERIFIED / PENDING / VERIFIED / FAILED |
| country_code / locale / timezone | 기본 KR / ko / Asia/Seoul |
| last_login_at | |
| created_at / updated_at | |

이메일·전화는 Social/Identity에서 올 수 있음. USER에 필수가 아님.

### SOCIAL_ACCOUNT

| Column | Notes |
|--------|-------|
| id | |
| user_id | FK |
| provider | KAKAO / NAVER / GOOGLE |
| provider_subject | 외부 subject |
| provider_email | nullable |
| linked_at / last_login_at | |

**UNIQUE(provider, provider_subject)**  
Linking 정책: `AUTH_POLICY_TBD`

### IDENTITY_VERIFICATION

| Column | Notes |
|--------|-------|
| id | |
| user_id | FK |
| provider | NICE / KCB / PASS / OTHER — `POLICY_TBD` |
| provider_verification_id | |
| status | UNVERIFIED / PENDING / VERIFIED / FAILED |
| verified_at | |
| ci_hash | 필요 시 해시만. 주민번호 원문 금지 |
| verified_name_masked | 최소 필요 시만 |
| birth_date | 연령대 산출용 — 공개 프로필과 분리 저장 |
| phone_e164_encrypted | 운영 필요 시만, 공개 금지 |
| created_at / updated_at | |

공개 API/화면으로 노출 금지.

### USER_PROFILE

| Column | Notes |
|--------|-------|
| user_id PK/FK | |
| nickname | unique |
| avatar_asset_id | MEDIA_ASSET FK nullable |
| gender | 공개 가능 — `POLICY_TBD` |
| age_band | 예: `30s` — 생년월일 원본 비공개 |
| region_code / region_label | 활동 지역 |
| bio | |
| updated_at | |

### USER_SPORT_PROFILE

| Column | Notes |
|--------|-------|
| id | |
| user_id | |
| sport_id | |
| skill_level | BEGINNER / INTERMEDIATE / ADVANCED / ... |
| metadata | jsonb |
| UNIQUE(user_id, sport_id) | |

Screen Golf만 Phase 1 사용. 종목 컬럼을 USER_PROFILE에 하드코딩하지 않음.

### MEDIA_ASSET

| Column | Notes |
|--------|-------|
| id | |
| owner_user_id | |
| kind | AVATAR / ... |
| storage_key / url | 실스토리지 Future |
| created_at | |

### SPORT

| Column | Notes |
|--------|-------|
| id | |
| code | UNIQUE `SCREEN_GOLF`, `BOWLING`, ... |
| name_i18n_key | |
| is_active | |
| sort_order | |

### SPORT_RULE

종목별 전략. 공통 JOIN에 하드코딩 금지.

| Column | Notes |
|--------|-------|
| sport_id | FK |
| duration_strategy | `PER_PLAYER_MINUTES` 등 |
| duration_param_json | e.g. `{"minutes_per_player":60}` |
| default_join_method | |
| metadata | |

스크린골프 MVP:

```json
{
  "duration_strategy": "PER_PLAYER_MINUTES",
  "minutes_per_player": 60
}
```

### VENUE

| Column | Notes |
|--------|-------|
| id | 자체 ID |
| sport_id | FK |
| provider | `NAVER`, `GOOGLE`, `MANUAL`, ... |
| provider_place_id | |
| name | |
| address / road_address | |
| latitude / longitude | |
| phone | |
| country_code / region | |
| timezone | optional override |
| metadata | JSONB |
| created_at / updated_at | |

**Unique**: `(provider, provider_place_id)`  
**Index**: `(sport_id, latitude, longitude)`, geo index 후보  
**확장**: Provider 변경 시에도 `id` 유지, mapping 테이블 추가 가능

### JOIN

| Column | Notes |
|--------|-------|
| id | |
| sport_id | |
| venue_id | |
| host_user_id | |
| title | |
| description | |
| status | DRAFT/OPEN/FULL/CONFIRMED/IN_PROGRESS/SETTLING/COMPLETED/CANCELLED |
| join_method | OPEN / APPROVAL |
| start_at | timestamptz |
| scheduled_end_at | timestamptz (재계산 가능) |
| planned_player_count | 생성 시 목표 총원 |
| confirmed_player_count | 확정 인원 (호스트 포함) |
| recruit_count | 모집 목표 = planned - current_host_party |
| reward_coin_per_participant | 참가자 1인당 보상 (asset 단위) |
| coin_asset_id | |
| room_creation_fee_amount | 소모된 생성비 (원장에도 기록) |
| reward_hold_total_amount | 예치 총액 |
| cost_share_type | DUTCH / HOST_PAYS / OTHER (옵션) |
| country_code / timezone | 스냅샷 |
| created_at / updated_at | |
| confirmed_at / cancelled_at | optional |

**Index**: `(venue_id, start_at)`, `(status, start_at)`, `(host_user_id, start_at)`, `(sport_id, start_at)`  
**주의**: `female_count` 등 성별 컬럼 하드코딩 금지 → REQUIREMENT

### JOIN_REQUIREMENT

| Column | Notes |
|--------|-------|
| id | |
| join_id | FK |
| requirement_type | GENDER / SKILL_LEVEL / AGE_RANGE / CUSTOM |
| operator | EQ / IN / BETWEEN / GTE / LTE |
| value_json | e.g. `"FEMALE"` / `["BEGINNER"]` / `{min:30,max:40}` |
| target_count | 해당 조건 슬롯 수 (nullable for soft filters) |
| sort_order | |
| metadata | |

예:

- GENDER / EQ / FEMALE / target_count=2
- GENDER / EQ / MALE / target_count=1
- SKILL_LEVEL / IN / ["BEGINNER","INTERMEDIATE"] / target_count=null

### JOIN_OPTION

| Column | Notes |
|--------|-------|
| join_id | |
| option_key | sport-scoped key |
| option_value_json | |

과도한 EAV 금지. MVP는 소수 키만.

### JOIN_PARTICIPANT

| Column | Notes |
|--------|-------|
| id | |
| join_id | |
| user_id | |
| role | HOST / PARTICIPANT |
| participation_status | APPLIED / APPROVED / CONFIRMED / COMPLETED / NO_SHOW / LEFT_EARLY / CANCELLED / DISPUTED |
| applied_at / approved_at / confirmed_at / cancelled_at | |
| party_size | 본인 포함 동행 수 (기본 1) |

**Unique**: `(join_id, user_id)` — 동일 조인 중복 참가 방지  
**Check**: host는 role=HOST 1명 (앱 레벨 + partial unique 후보)  
**자기 조인 참가**: host row는 생성 시 자동 INSERT. 추가 PARTICIPANT row 금지(앱 규칙)

### REWARD_SETTLEMENT

참가자별 정산. JOIN_PARTICIPANT에 몰아넣지 않고 분리하여 코인 상태 폭주를 방지.

| Column | Notes |
|--------|-------|
| id | |
| join_id | |
| join_participant_id | UNIQUE |
| coin_asset_id | |
| amount | 예정 지급액 |
| reward_status | NOT_ELIGIBLE / HELD / PENDING_CONFIRMATION / PAID / AUTO_PAID / DISPUTED / REFUNDED |
| hold_id | FK COIN_HOLD |
| settlement_available_at | = scheduled_end_at |
| auto_pay_at | = scheduled_end_at + 24h |
| held_at / paid_at / disputed_at / refunded_at | |
| paid_tx_id | FK COIN_TRANSACTION |
| idempotency_key | UNIQUE — worker 재실행 방어 |

Host(방장)는 기본적으로 `NOT_ELIGIBLE` (자기 보상 없음).

### WALLET

| Column | Notes |
|--------|-------|
| id | |
| user_id | |
| coin_asset_id | |
| available_balance | |
| held_balance | |
| currency_code | 표시용 (코인↔법정화폐 정책 TBD) |
| updated_at | |

**Unique**: `(user_id, coin_asset_id)`  
잔액은 트랜잭션 커밋과 함께 갱신. 원장 합과 주기적 대사.

### COIN_ASSET

| Column | Notes |
|--------|-------|
| id | |
| code | `JJOIN_COIN` (1차 단일) |
| name_i18n_key | |
| is_active | |

동/은/금 미도입. 복수 asset 확장만 열어둔다.

### COIN_TRANSACTION

| Column | Notes |
|--------|-------|
| id | |
| wallet_id | |
| coin_asset_id | |
| type | ROOM_CREATION_FEE / JOIN_REWARD_HOLD / JOIN_REWARD_RELEASE / JOIN_REWARD_TRANSFER / JOIN_REWARD_REFUND / COIN_PURCHASE / SHOP_PURCHASE / ADMIN_ADJUSTMENT |
| direction | DEBIT / CREDIT |
| amount | > 0 |
| balance_after_available | |
| balance_after_held | |
| ref_type / ref_id | polymorphic 참조 |
| idempotency_key | UNIQUE |
| metadata | |
| created_at | |

### COIN_HOLD

| Column | Notes |
|--------|-------|
| id | |
| wallet_id | 원래 소유자(방장) |
| coin_asset_id | |
| amount | |
| reason | JOIN_REWARD |
| status | OPEN / RELEASED / REFUNDED / PARTIALLY_RELEASED |
| join_id | |
| created_at / released_at / refunded_at | |

보상 총 HOLD 1건 + Settlement 배분, 또는 Settlement당 HOLD —  
**1차 채택: Join 단위 Reward HOLD 1건 + Settlement별 allocated_amount**  
(부분 지급/환불에 `PARTIALLY_RELEASED` 사용)

### PAYMENT / PRODUCT / ORDER / ORDER_ITEM

Shop Concept용 스텁. 가격·패키지 정책은 TBD.  
스키마만 두고 운영 수치는 넣지 않음.

### REPORT

| Column | Notes |
|--------|-------|
| id | |
| join_id | |
| reporter_user_id | |
| subject_participant_id | |
| reason_code | NO_SHOW / LEFT_EARLY / MISCONDUCT / OTHER |
| description | |
| status | OPEN / UNDER_REVIEW / RESOLVED / REJECTED |
| created_at | |

신고 생성 시 해당 Settlement → `DISPUTED`, auto_pay 중단.

### AUDIT_LOG

강제 단일 거대 테이블이 아니라,  
원장·Settlement timestamp·REPORT·상태 컬럼으로 1차 추적.  
운영 고도화 시 append-only `AUDIT_LOG` 추가:

| Column | Notes |
|--------|-------|
| actor_user_id | |
| action | |
| entity_type / entity_id | |
| before_json / after_json | |
| created_at | |

---

## DB 검증 질문 답변

| # | 질문 | 답 |
|---|------|----|
| 1 | 한 사용자가 여러 조인 생성? | YES — `JOIN.host_user_id` |
| 2 | 여러 조인 참가? | YES — `JOIN_PARTICIPANT` |
| 3 | 자기 조인 중복 참가 방지? | YES — host row 단일 + unique(join,user) |
| 4 | 동일 조인 중복 참가 방지? | YES — UNIQUE(join_id,user_id) |
| 5 | 생성비/보상 분리 추적? | YES — tx type + HOLD |
| 6 | HOLD 원래 소유자? | YES — `COIN_HOLD.wallet_id` |
| 7 | 참가자별 예정액? | YES — `REWARD_SETTLEMENT.amount` |
| 8 | 지급/자동/환불/분쟁 구분? | YES — reward_status + tx type |
| 9 | 코인 이동 원인 추적? | YES — ledger ref |
| 10 | 중복 지급 방지? | YES — idempotency_key + status guard |
| 11 | Worker 재실행 안전? | YES — idempotent transition |
| 12 | 인원 변경 시 종료시간 갱신? | YES — confirmed_player_count → SPORT_RULE |
| 13 | 타 종목 시 JOIN 재작성? | NO — SPORT_RULE/OPTION |
| 14 | 국가/언어/TZ? | YES — user/venue/join snapshot |
| 15 | 지도 Provider 교체? | YES — venue.id 유지 |

---

## 인덱스 / 제약 요약

- `venue(provider, provider_place_id)` UNIQUE
- `join_participant(join_id, user_id)` UNIQUE
- `wallet(user_id, coin_asset_id)` UNIQUE
- `reward_settlement(join_participant_id)` UNIQUE
- `reward_settlement(idempotency_key)` UNIQUE
- `coin_transaction(idempotency_key)` UNIQUE
- Geo/list: `join(status, start_at)`, `venue(sport_id)` + geo
- Auto-pay worker: `reward_settlement(reward_status, auto_pay_at)`
