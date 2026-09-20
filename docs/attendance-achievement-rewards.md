# 출석 · 업적 보상 SSOT (Phase B)

## 출석 날짜

- 서버가 **Asia/Seoul (KST)** 달력일을 결정한다. 클라이언트 로컬 날짜를 신뢰하지 않는다.
- 키: `YYYY-MM-DD` (`attendanceKstDateKey` + `kstDateParts`).
- 유일 제약: `daily_attendance_check_ins (userId, kstDate)`.
- 멱등 키: `reward:attendance:{userId}:{kstDate}` — `RewardGrant` / `CoinIssuance` / `CoinTransaction` 동일.

KST 자정 예: `2026-09-19T14:59:59.999Z` → `2026-09-19`, `2026-09-19T15:00:00.000Z` → `2026-09-20`.

## 스트릭

- 일자 SSOT: `DailyAttendanceCheckIn`.
- 투영: `UserAttendanceStats` (`currentStreak`, `bestStreak`, `totalDays`, `lastCheckInKstDate`).
- 연속 여부는 직전 KST 날짜가 어제인지로 계산한다 (`nextAttendanceStreak`).

## 조인 완료 집계

| 업적 | 조건 | 제외 |
|---|---|---|
| HOST_JOIN_COMPLETED | `Join.hostUserId = user` AND `Join.status = COMPLETED` | DRAFT / OPEN / SETTLING / CANCELLED, 생성만 |
| PARTICIPANT_JOIN_COMPLETED | `JoinParticipant.role = PARTICIPANT` AND `participationStatus = COMPLETED` | APPLIED / APPROVED / CONFIRMED, HOST 행, NO_SHOW |

SCREEN / FIELD / STANDARD / STORE_MATCHING 모두 동일 상태값을 쓴다.

## 보상 키

- 출석: `reward:attendance:{userId}:{kstDate}`
- 호스트 마일스톤: `reward:host_milestone:{userId}:{threshold}`
- 참가 마일스톤: `reward:participation_milestone:{userId}:{threshold}`
- 코인은 `CoinLedgerService.issueCoins` (`EVENT_REWARD`)만 사용한다. 원장 밖 발행 금지.

## 알림

기존 통합 Notification + Push (`ATTENDANCE_REWARD`, `ACHIEVEMENT_REWARD`).
`eventKey`로 중복 발송을 막고, 탭 시 `/my/rewards`로 이동한다.

## API

- `POST /me/rewards/attendance/ping` — 앱 진입용. 이미 출석/비활성도 200.
- `POST /me/rewards/attendance/check-in` — 동일 소프트 동작.
- `GET /me/rewards/progress` — 스트릭 + 마일스톤 진행. 평가도 여기서 한 번 더 수행.
- `GET/PUT /admin/reward-policy` — 마일스톤 사다리 설정.
