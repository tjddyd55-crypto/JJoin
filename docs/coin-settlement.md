# Coin & Settlement (SSOT)

## 1. 분리 원칙

| 구분 | 성격 | 수취 | 시점 |
|------|------|------|------|
| ROOM_CREATION_FEE | 플랫폼 이용 비용 | 플랫폼 (소모) | 조인 생성 성공 시 |
| JOIN_REWARD | 참가자 보상 | 참가자 | 정산 확정 시 (HOLD 후) |

두 개념을 UI·DB·원장에서 절대 혼동하지 않는다.

> 모든 수치는 **POLICY_TBD**. Figma Mock만 사용 (예: 생성비 2, 1인 보상 20).

---

## 2. Wallet 모델

```
available_balance  = 사용 가능
held_balance       = 보상 예치 등 HOLD 합
total              = available + held  (표시용)
```

USER 테이블의 단일 `coin_balance` 금지.

---

## 3. 조인 생성 시 코인 흐름 (예시 개념)

방장 available = 100  
생성비 Mock = 2  
참가 보상 Mock = 20 × 모집 3명 = 60 HOLD

```
1) DEBIT ROOM_CREATION_FEE amount=2
   available: 100 → 98

2) DEBIT JOIN_REWARD_HOLD amount=60
   available: 98 → 38
   held: 0 → 60
   COIN_HOLD status=OPEN
   각 REWARD_SETTLEMENT amount=20 status=HELD
```

취소/환불 세부 정책은 TBD.  
단, **생성비와 보상 HOLD는 별도 원장 type** 으로 남겨 환불 정책을 나중에 붙일 수 있게 한다.

---

## 4. 정산 트리거

스크린골프 MVP:

```
settlement_available_at = scheduled_end_at
auto_pay_at             = scheduled_end_at + interval '24 hours'
```

`scheduled_end_at` 산정:

```
confirmed_player_count × SPORT_RULE.minutes_per_player
```

실제 “종료 버튼”이 추가돼도, 방장 미클릭으로 자동지급이 무한 지연되면 안 된다.

---

## 5. 방장 수동 지급

조건: `now >= settlement_available_at` AND settlement.`HELD|PENDING_CONFIRMATION`

액션: `참석 완료 / 보상 지급`

Atomic:

```
BEGIN
  lock settlement (status guard)
  lock hold + wallets
  HOLD partial/full release
  CREDIT participant JOIN_REWARD_TRANSFER
  settlement → PAID, paid_at=now, paid_tx_id=...
COMMIT
```

---

## 6. 24h 자동 지급

Worker 조건:

```
reward_status IN (HELD, PENDING_CONFIRMATION)
AND auto_pay_at <= now
AND NOT disputed
```

결과: `AUTO_PAID`  
동일 `idempotency_key` 로 재실행 안전.

---

## 7. 분쟁

방장 `문제 있음` → REPORT 생성 → settlement `DISPUTED`  
→ auto_pay 스킵  
→ 운영 판정 후 PAID / REFUNDED / 기타 (판정 기준 TBD)

participation_status 예: `NO_SHOW`, `LEFT_EARLY`, `DISPUTED`  
reward_status 와 **동일 컬럼 사용 금지**.

---

## 8. Transaction Types

| Type | 설명 |
|------|------|
| ROOM_CREATION_FEE | 방 생성 소모 |
| JOIN_REWARD_HOLD | available → held |
| JOIN_REWARD_RELEASE | held 해제 (내부) |
| JOIN_REWARD_TRANSFER | 참가자 credit |
| JOIN_REWARD_REFUND | 방장 held → available |
| COIN_PURCHASE | 구매 (스텁) |
| SHOP_PURCHASE | 쇼핑 사용 (스텁) |
| ADMIN_ADJUSTMENT | 운영 조정 |

---

## 9. Idempotency

- Settlement 지급: `settlement:{id}:pay`
- Auto pay: `settlement:{id}:auto_pay`
- Hold create: `join:{id}:reward_hold`
- Fee: `join:{id}:creation_fee`

상태 머신:

```
HELD → PAID
HELD → AUTO_PAID
HELD → DISPUTED
DISPUTED → PAID | REFUNDED  (ops)
HELD → REFUNDED             (join cancel path, TBD)
```

불법 전이 거부.

---

## 10. UX 카피 원칙

- “참가 보상” (성별 가격처럼 보이지 않게)
- “방 생성 비용” vs “보상 예치” 라벨 분리
- “방장 확인 대기 / N시간 후 자동 지급” 명시
- 도박·골드 과다 이펙트 지양
