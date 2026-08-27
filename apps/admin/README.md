# JJOIN Admin (HQ)

관리자 웹 UI — 매장 인증 승인, 코인 지급, 분쟁 처리.

## 접속

로컬:

```bash
pnpm --filter @jjoin/admin dev
```

기본 URL: `http://127.0.0.1:5173`

API 연결:

```bash
# .env / shell
VITE_API_URL=https://api-production-2d67e.up.railway.app
```

로그인 페이지: `/` (미인증 시 로그인 폼)

## 로그인

Railway API Variables:

- `JJOIN_ADMIN_LOGIN_ID`
- `JJOIN_ADMIN_LOGIN_PASSWORD`

서버 시작 시 bootstrap → DB hashed credential → `POST /auth/admin/login`.

개발용 mock: `DEV_ADMIN` 버튼 (`SOCIAL_AUTH_MODE=mock|hybrid`).

## 주요 화면

- `/store-verifications` — 매장 인증
- `/coin` — 코인 지급/공급
- `/disputes` — 분쟁
