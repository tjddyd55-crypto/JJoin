/**
 * Attendance reminder worker for Railway cron / manual ops.
 *
 *   ATTENDANCE_REMINDER_HTTP_URL=https://<api>/notifications/attendance-reminders-run \
 *   SETTLEMENT_CRON_SECRET=... \
 *   pnpm attendance-reminders
 */
async function main() {
  const url = (process.env.ATTENDANCE_REMINDER_HTTP_URL ?? '').trim();
  const secret = (process.env.SETTLEMENT_CRON_SECRET ?? '').trim();
  if (!url) {
    console.error(
      'ATTENDANCE_REMINDER_HTTP_URL is required (e.g. https://api.../notifications/attendance-reminders-run)',
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
  console.log('attendanceReminderBatch', {
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
