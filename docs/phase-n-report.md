# Phase N — Production Auth Activation Report

**Status:** READY_FOR_KAKAO_CONSOLE (pending deploy verification)

## Scope

- Native social login SDK integration (Kakao/Naver/Google)
- Production auth path in mobile (`obtainSocialCredential` → `/auth/social/exchange`)
- Server mock guard + `GET /me/identity/capability`
- Production identity UNAVAILABLE UX (no fake verification)
- Docs, smoke scripts, key hash helper

## Not in scope (Phase N.1+)

- NICE/KCB/PASS production identity adapter
- Naver/Google console E2E (after Kakao)
- Push / Coin Purchase / PG/IAP

## Railway env (names only)

| Variable | Recommended |
|----------|-------------|
| `SOCIAL_AUTH_MODE` | `hybrid` (smoke personas + real tokens) |
| `IDENTITY_PROVIDER` | `mock` until contract |
| `GOOGLE_OAUTH_CLIENT_ID` | Web client ID when Google enabled |

## Next: Kakao console

See `docs/phase-n-provider-console-checklist.md` and USER_ACTION section in final report.
