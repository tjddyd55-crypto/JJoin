/**
 * Notification outbox delivery worker for Railway cron / manual ops.
 *
 *   NOTIFICATION_DELIVER_HTTP_URL=https://<api>/notifications/deliver-pending \
 *   SETTLEMENT_CRON_SECRET=... \
 *   pnpm notification-delivery
 */
async function main() {
  const url = (process.env.NOTIFICATION_DELIVER_HTTP_URL ?? '').trim();
  const secret = (process.env.SETTLEMENT_CRON_SECRET ?? '').trim();
  if (!url) {
    console.error(
      'NOTIFICATION_DELIVER_HTTP_URL is required (e.g. https://api.../notifications/deliver-pending)',
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
      'x-notification-cron-secret': secret,
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  const text = await res.text();
  console.log('notificationDeliverBatch', {
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
