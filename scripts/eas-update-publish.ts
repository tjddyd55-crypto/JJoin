/**
 * EAS Update publisher — fail-closed.
 *
 *   pnpm update:dev   → development channel (may publish if EAS auth exists)
 *   pnpm update:prod  → production channel, DRY-RUN by default
 *
 * Production never publishes unless ALL of:
 *   --i-know-this-publishes-production
 *   EAS_UPDATE_ALLOW_PRODUCTION=1
 *   clean git tree on main
 *   no APP_VARIANT/dev clues
 *
 * First real Production publish is operator-approved and out of scope for
 * the setup PR. Do not add a CI job that runs this against production.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectProductionDevClues,
  evaluatePublishGuard,
  normalizeEasUpdateChannel,
  type GitSnapshot,
} from '../apps/mobile/src/config/eas-update-publish-guard.ts';
import {
  collectBinaryRebuildMatches,
  formatBinaryRebuildReport,
} from '../apps/mobile/src/config/binary-rebuild-required.ts';
import { readAppVersionFromConfigSource } from '../apps/mobile/src/config/app-config-version.ts';
import { RUNTIME_VERSION_POLICY } from '../apps/mobile/eas-update-policy.cjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MOBILE_ROOT = path.join(REPO_ROOT, 'apps/mobile');
const APP_CONFIG_PATH = path.join(MOBILE_ROOT, 'app.config.ts');

type CliArgs = {
  channel: string;
  message: string | null;
  dryRun: boolean;
  allowProductionPublish: boolean;
  allowBinaryMismatch: boolean;
};

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const channel = normalizeEasUpdateChannel(args.channel);
  if (!channel) {
    fail(`unknown channel "${args.channel}"`);
  }

  const git = readGitSnapshot();
  const appVersion = readAppVersionFromConfigSource(fs.readFileSync(APP_CONFIG_PATH, 'utf8'));
  const binaryMatches = collectBinaryRebuildMatches(listChangedFiles());
  const extraDevClues = collectProductionDevClues(process.env);
  const dryRun = channel === 'production' ? trueUnlessExplicitPublish(args) : args.dryRun;

  printPlan({
    channel,
    dryRun,
    git,
    appVersion,
    binaryReport: formatBinaryRebuildReport(binaryMatches),
  });

  const guard = evaluatePublishGuard({
    channel,
    git,
    appVariant: process.env.APP_VARIANT,
    extraDevClues,
    allowProductionPublish: args.allowProductionPublish,
    dryRun,
    binaryRebuildRequired: binaryMatches.length > 0,
    allowBinaryMismatch: args.allowBinaryMismatch,
  });
  for (const issue of guard.issues) {
    console.log(`[${issue.level}] ${issue.code}: ${issue.message}`);
  }
  if (!guard.canPublish) {
    fail('publish blocked by fail-closed guards');
  }

  const easArgs = buildEasUpdateArgs(channel, args.message, git.headSha, appVersion.version);
  if (dryRun) {
    console.log('[dry-run] would run:');
    console.log(`  (cd apps/mobile && ${formatCommand(easArgs)})`);
    if (channel === 'production') {
      console.log(
        '[note] first real production publish is manual/operator-approved; this script stays dry-run unless both confirm flags are set',
      );
    }
    return;
  }

  if (!easAuthAvailable()) {
    console.log('[skip] EAS CLI auth unavailable. Operator command:');
    console.log(`  (cd apps/mobile && ${formatCommand(easArgs)})`);
    process.exit(0);
  }

  execFileSync(easArgs[0], easArgs.slice(1), {
    cwd: MOBILE_ROOT,
    stdio: 'inherit',
    env: sanitizedEnv(channel),
  });
}

function trueUnlessExplicitPublish(args: CliArgs): boolean {
  return args.dryRun || !args.allowProductionPublish;
}

function parseArgs(argv: string[]): CliArgs {
  let channel = '';
  let message: string | null = null;
  let dryRun = argv.includes('--dry-run');
  let allowProductionPublish = false;
  let allowBinaryMismatch = argv.includes('--allow-binary-mismatch');

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--channel') {
      channel = argv[index + 1] ?? '';
      index += 1;
      continue;
    }
    if (token === '--message') {
      message = argv[index + 1] ?? null;
      index += 1;
    }
  }
  if (
    argv.includes('--i-know-this-publishes-production') &&
    process.env.EAS_UPDATE_ALLOW_PRODUCTION === '1'
  ) {
    allowProductionPublish = true;
  }
  if (!channel) fail('missing --channel development|production');
  return { channel, message, dryRun, allowProductionPublish, allowBinaryMismatch };
}

function readGitSnapshot(): GitSnapshot {
  const branch = gitOutput(['rev-parse', '--abbrev-ref', 'HEAD']);
  const headSha = gitOutput(['rev-parse', 'HEAD']);
  const dirty = gitOutput(['status', '--porcelain']).length > 0;
  return { branch, dirty, headSha };
}

function listChangedFiles(): string[] {
  const names = new Set<string>();
  addGitNames(names, ['diff', '--name-only']);
  addGitNames(names, ['diff', '--name-only', '--cached']);
  addGitNames(names, ['diff', '--name-only', 'origin/main...HEAD']);
  return [...names];
}

function addGitNames(target: Set<string>, gitArgs: string[]): void {
  try {
    for (const line of gitOutput(gitArgs).split('\n')) {
      if (line) target.add(line);
    }
  } catch {
    // origin/main may be missing in a shallow clone — ignore that source.
  }
}

function gitOutput(gitArgs: string[]): string {
  return execFileSync('git', gitArgs, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function printPlan(input: {
  channel: string;
  dryRun: boolean;
  git: GitSnapshot;
  appVersion: { version: string; versionCode: number | null };
  binaryReport: string;
}): void {
  console.log('EAS Update plan');
  console.log(`  channel:         ${input.channel}`);
  console.log(`  runtime policy:  ${RUNTIME_VERSION_POLICY.policy} → ${input.appVersion.version}`);
  console.log(`  app version:     ${input.appVersion.version}`);
  console.log(`  versionCode:     ${input.appVersion.versionCode ?? '—'}`);
  console.log(`  git:             ${input.git.branch} ${input.git.headSha.slice(0, 8)}`);
  console.log(`  dirty:           ${input.git.dirty ? 'yes' : 'no'}`);
  console.log(`  mode:            ${input.dryRun ? 'DRY-RUN' : 'PUBLISH'}`);
  console.log(input.binaryReport);
}

function buildEasUpdateArgs(
  channel: string,
  message: string | null,
  headSha: string,
  version: string,
): string[] {
  const resolvedMessage =
    message ?? `ota ${channel} ${version} ${headSha.slice(0, 8)}`.slice(0, 1024);
  return [
    'npx',
    'eas-cli',
    'update',
    '--channel',
    channel,
    '--message',
    resolvedMessage,
    '--non-interactive',
  ];
}

function formatCommand(args: string[]): string {
  return args.map((part) => (part.includes(' ') ? JSON.stringify(part) : part)).join(' ');
}

function easAuthAvailable(): boolean {
  try {
    execFileSync('npx', ['eas-cli', 'whoami'], {
      cwd: MOBILE_ROOT,
      stdio: 'ignore',
      timeout: 20_000,
    });
    return true;
  } catch {
    return false;
  }
}

function sanitizedEnv(channel: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    APP_VARIANT: channel === 'development' ? 'development' : 'production',
    EXPO_PUBLIC_GIT_SHA: readGitSnapshot().headSha,
  };
}

function fail(message: string): never {
  console.error(`[error] ${message}`);
  process.exit(1);
}

main();
