#!/bin/sh
set -e
FILE=prisma/migrations/0001_foundation/migration.sql
# strip UTF-8 BOM if present
if [ -f "$FILE" ]; then
  od -An -tx1 -N3 "$FILE" | tr -d ' \n' | grep -qi '^efbbbf' && tail -c +4 "$FILE" > "$FILE.nobom" && mv "$FILE.nobom" "$FILE" || true
fi
pnpm exec prisma migrate resolve --rolled-back 0001_foundation --schema=prisma/schema.prisma || true
pnpm exec prisma migrate deploy --schema=prisma/schema.prisma
pnpm exec prisma migrate status --schema=prisma/schema.prisma
