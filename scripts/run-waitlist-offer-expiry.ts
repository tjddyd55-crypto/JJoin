/**
 * Waitlist offer expiry reconciler for Railway cron / manual ops.
 *
 *   WAITLIST_OFFER_HTTP_URL=https://<api>/joins/waitlist/offers/process-expired \
 *   SETTLEMENT_CRON_SECRET=... \
 *   pnpm waitlist-offer-expiry
 *
 * Cadence: every 5 minutes (30-minute offer TTL; avoids duplicate processing via status-gated updates).
 */
async function main() {
  const url = (process.env.WAITLIST_OFFER_HTTP_URL ?? '').trim();
  const secret = (process.env.SETTLEMENT_CRON_SECRET ?? '').trim();
  if (!url) {
    console.error(
      'WAITLIST_OFFER_HTTP_URL is required (e.g. https://api.../joins/waitlist/offers/process-expired)',
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
  console.log('waitlistOfferExpiry', res.status, text.slice(0, 800));
  if (!res.ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
