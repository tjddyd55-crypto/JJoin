# Database (Prisma / PostgreSQL)

## Rules

- UUID PKs
- timestamptz (UTC)
- Soft enums via Prisma enum
- Shop entities excluded from Phase 2 first migration
- No economic policy numbers as migration defaults

## Core Tables

USER, USER_PROFILE, SOCIAL_ACCOUNT, IDENTITY_VERIFICATION, MEDIA_ASSET,  
SPORT, SPORT_RULE, USER_SPORT_PROFILE, VENUE,  
JOIN, JOIN_REQUIREMENT, JOIN_OPTION, JOIN_PARTICIPANT, REWARD_SETTLEMENT,  
WALLET, COIN_ASSET, COIN_TRANSACTION, COIN_HOLD, REPORT

## Critical Uniques

| Table | Constraint |
|-------|------------|
| SOCIAL_ACCOUNT | (provider, provider_subject) |
| JOIN_PARTICIPANT | (join_id, user_id) |
| WALLET | (user_id, coin_asset_id) |
| USER_SPORT_PROFILE | (user_id, sport_id) |
| REWARD_SETTLEMENT | (join_participant_id) |
| COIN_TRANSACTION | (idempotency_key) |
| VENUE | (provider, provider_place_id) |

## Status Families (separate)

- Join: DRAFT OPEN FULL CONFIRMED IN_PROGRESS SETTLING COMPLETED CANCELLED
- Participation: APPLIED APPROVED CONFIRMED COMPLETED NO_SHOW LEFT_EARLY CANCELLED DISPUTED
- Reward: NOT_ELIGIBLE HELD PENDING_CONFIRMATION PAID AUTO_PAID DISPUTED REFUNDED
- Identity: UNVERIFIED PENDING VERIFIED FAILED

## Screen Golf End Time

`SPORT_RULE.duration_strategy = PER_PLAYER_MINUTES` + param `{ minutes_per_player: 60 }`  
Not hardcoded globally in JOIN service.
