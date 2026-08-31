/**
 * Recurring store-matching join materializer for Railway cron / manual ops.
 *
 * Preferred ops path (same pattern as matching-deadline / chat-purge):
 *   RECURRING_JOINS_HTTP_URL=https://<api>/joins/recurring/run \
 *   SETTLEMENT_CRON_SECRET=... \
 *   pnpm recurring-joins
 *
 * Auth: `x-settlement-cron-secret` (preferred) or `Authorization: Bearer`.
 * Cadence recommendation: hourly (`0 * * * *` UTC). Ahead window is domain RECURRING_AHEAD_WEEKS.
 */
async function main() {
  const url = (process.env.RECURRING_JOINS_HTTP_URL ?? '').trim();
  const secret = (process.env.SETTLEMENT_CRON_SECRET ?? '').trim();
  if (!url) {
    console.error(
      'RECURRING_JOINS_HTTP_URL is required (e.g. https://api.../joins/recurring/run)',
    );
    process.exitCode = 1;
    return;
  }
  if (!secret) {
    console.error('SETTLEMENT_CRON_SECRET is required');
    process.exitCode = 1;
    return;
  }

  const startedAt = new Date().toISOString();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-settlement-cron-secret': secret,
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  const text = await res.text();
  console.log('recurringJoinsBatch', {
    startedAt,
    status: res.status,
    body: text.slice(0, 800),
  });
  if (!res.ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
