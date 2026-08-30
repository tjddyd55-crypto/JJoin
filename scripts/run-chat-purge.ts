/**
 * Join chat purge worker for Railway cron / manual ops.
 *
 * Preferred ops path (same pattern as matching-deadline / settlement cron):
 *   CHAT_PURGE_HTTP_URL=https://<api>/joins/chat/purge-run \
 *   SETTLEMENT_CRON_SECRET=... \
 *   pnpm chat-purge
 *
 * Auth: `x-settlement-cron-secret` (preferred) or `Authorization: Bearer`.
 * Cadence recommendation: hourly (`0 * * * *` UTC). Chat purge is not latency-sensitive.
 *
 * Deletes only chat messages / members / closes rooms. Never deletes Join history.
 */
async function main() {
  const url = (process.env.CHAT_PURGE_HTTP_URL ?? '').trim();
  const secret = (process.env.SETTLEMENT_CRON_SECRET ?? '').trim();
  if (!url) {
    console.error(
      'CHAT_PURGE_HTTP_URL is required (e.g. https://api.../joins/chat/purge-run)',
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
  // Never log the secret; body is aggregate counts only.
  console.log('chatPurgeBatch', {
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
