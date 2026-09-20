/** Railway cron services set JJOIN_CRON_SKIP_BUILD=1 to skip monorepo nest build. */
if (process.env.JJOIN_CRON_SKIP_BUILD === '1') {
  console.log('jjoin: cron skip build');
  process.exit(0);
}
const { spawnSync } = require('child_process');
const r = spawnSync('pnpm', ['-r', '--if-present', 'run', 'build'], { stdio: 'inherit', shell: true });
process.exit(r.status == null ? 1 : r.status);
