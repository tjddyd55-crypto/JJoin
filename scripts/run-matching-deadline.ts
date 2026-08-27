/**
 * STORE_MATCHING recruitment deadline reconciler for Railway cron / manual ops.
 * Prefers HTTP: POST /store-joins/matching/deadline/run
 *
 * Usage:
 *   MATCHING_DEADLINE_HTTP_URL=https://<api>/store-joins/matching/deadline/run \
 *   SETTLEMENT_CRON_SECRET=... \
 *   pnpm exec tsx scripts/run-matching-deadline.ts
 */
async function main() {
  const url = (process.env.MATCHING_DEADLINE_HTTP_URL ?? '').trim();
  const secret = (process.env.SETTLEMENT_CRON_SECRET ?? '').trim();
  if (!url) {
    console.error(
      'MATCHING_DEADLINE_HTTP_URL is required (e.g. https://api.../store-joins/matching/deadline/run)',
    );
    process.exitCode = 1;
    return;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...(secret ? { 'x-settlement-cron-secret': secret } : {}),
    },
  });
  const text = await res.text();
  console.log('matching_deadline', res.status, text.slice(0, 800));
  if (!res.ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
