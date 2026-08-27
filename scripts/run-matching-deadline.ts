/**
 * STORE_MATCHING recruitment deadline reconciler for Railway cron / manual ops.
 *
 * Preferred ops path (same pattern as settlement-cron HTTP callers):
 *   MATCHING_DEADLINE_HTTP_URL=https://<api>/store-joins/matching/deadline/run \
 *   SETTLEMENT_CRON_SECRET=... \
 *   pnpm matching-deadline
 *
 * Auth: send secret via `x-settlement-cron-secret` (preferred) or `Authorization: Bearer`.
 * Cadence recommendation: every 5 minutes (minute-level close accuracy; avoid 1-minute spam).
 * Lazy reconcile on discover/mine/detail/apply remains the safety net.
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
  if (!secret) {
    console.error('SETTLEMENT_CRON_SECRET is required');
    process.exitCode = 1;
    return;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-settlement-cron-secret': secret,
      Authorization: `Bearer ${secret}`,
    },
  });
  const text = await res.text();
  // Never log the secret; body is aggregate counts only.
  console.log('matchingDeadlineBatch', res.status, text.slice(0, 800));
  if (!res.ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
