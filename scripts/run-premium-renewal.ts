/**
 * Premium subscription renewal batch for Railway cron / manual ops.
 *
 *   PREMIUM_RENEWAL_HTTP_URL=https://<api>/premium/renewals/process \
 *   SETTLEMENT_CRON_SECRET=... \
 *   pnpm premium-renewal
 *
 * Auth: `x-settlement-cron-secret` (preferred) or `Authorization: Bearer`.
 * Cadence recommendation: every 15 minutes (UTC cron on Railway).
 */
async function main() {
  const url = (process.env.PREMIUM_RENEWAL_HTTP_URL ?? '').trim();
  const secret = (process.env.SETTLEMENT_CRON_SECRET ?? '').trim();
  if (!url) {
    console.error(
      'PREMIUM_RENEWAL_HTTP_URL is required (e.g. https://api.../premium/renewals/process)',
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
  console.log('premiumRenewalBatch', {
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
