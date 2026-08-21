# Backend Architecture

## Stack

- NestJS + TypeScript
- PostgreSQL + Prisma
- REST API
- Modular domain modules

## Modules (skeleton)

```
auth
identity
users
sports
venues
joins
participation
wallet
settlement
reports
media
```

## Principles

- Feature modules over flat controllers/services dump
- Provider ports for Social / Identity / Venue / Storage
- Coin mutations always in DB transactions
- Settlement worker must be idempotent (unique keys + status guards)
- Redis/BullMQ slot reserved for auto-pay / notifications (infra later)

## API Consumers

Mobile, future Web, Admin share the same REST contracts via `@jjoin/types` + `@jjoin/api-client`.

## Out of Scope (Phase 2 Foundation)

Real OAuth, real identity vendor, real map billing, payments, shop, full CRUD.
