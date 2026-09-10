-- Join create idempotency SSOT: unique (host, client key) claimed by the Join row
-- inside the same transaction. Failed creates roll back; no orphan lock table.
-- Reward 0 / fee 0 still insert a Join row, so the race is covered without a ledger.

ALTER TABLE "joins" ADD COLUMN "client_idempotency_key" TEXT;

UPDATE "joins" AS j
SET "client_idempotency_key" = o."option_value_json"->>'key'
FROM "join_options" AS o
WHERE o."join_id" = j."id"
  AND o."option_key" = 'client_idempotency_key'
  AND NULLIF(BTRIM(o."option_value_json"->>'key'), '') IS NOT NULL
  AND j."client_idempotency_key" IS NULL;

-- Prior lookup-first races may have duplicate host+key rows. Keep the earliest.
UPDATE "joins" AS j
SET "client_idempotency_key" = NULL
WHERE j."client_idempotency_key" IS NOT NULL
  AND j."id" NOT IN (
    SELECT kept.id
    FROM (
      SELECT DISTINCT ON ("host_user_id", "client_idempotency_key") "id"
      FROM "joins"
      WHERE "client_idempotency_key" IS NOT NULL
      ORDER BY "host_user_id", "client_idempotency_key", "created_at" ASC, "id" ASC
    ) AS kept
  );

CREATE UNIQUE INDEX "joins_host_client_idempotency_key"
ON "joins"("host_user_id", "client_idempotency_key");
