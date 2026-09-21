import {
  EAS_UPDATE_CHANNELS,
  type EasUpdateChannel,
} from '../../eas-update-policy.cjs';

export const PRODUCTION_PUBLISH_ALLOWED_BRANCHES = ['main'] as const;

export type GitSnapshot = {
  branch: string;
  dirty: boolean;
  headSha: string;
};

export type PublishGuardInput = {
  channel: string;
  git: GitSnapshot;
  appVariant?: string;
  extraDevClues?: string[];
  allowProductionPublish: boolean;
  dryRun: boolean;
  binaryRebuildRequired: boolean;
  allowBinaryMismatch: boolean;
};

export type PublishGuardIssue = {
  level: 'error' | 'warning';
  code: string;
  message: string;
};

export type PublishGuardResult = {
  channel: EasUpdateChannel | null;
  canPublish: boolean;
  issues: PublishGuardIssue[];
};

const DEV_CLUE_LABELS: Record<string, string> = {
  APP_VARIANT: 'APP_VARIANT=development',
  INTERNAL_TOOLS: 'EXPO_PUBLIC_INTERNAL_TOOLS_ENABLED is enabled',
  CHANNEL_ENV: 'EAS_UPDATE_CHANNEL=development',
};

export function normalizeEasUpdateChannel(
  channel: string,
): EasUpdateChannel | null {
  if (channel === EAS_UPDATE_CHANNELS.development) return 'development';
  if (channel === EAS_UPDATE_CHANNELS.production) return 'production';
  return null;
}

export type PublishEnvClues = {
  APP_VARIANT?: string;
  EXPO_PUBLIC_INTERNAL_TOOLS_ENABLED?: string;
  EAS_UPDATE_CHANNEL?: string;
};

export function collectProductionDevClues(env: PublishEnvClues): string[] {
  const clues: string[] = [];
  if (env.APP_VARIANT === 'development') clues.push(DEV_CLUE_LABELS.APP_VARIANT);
  if (isTruthyEnv(env.EXPO_PUBLIC_INTERNAL_TOOLS_ENABLED)) {
    clues.push(DEV_CLUE_LABELS.INTERNAL_TOOLS);
  }
  if (env.EAS_UPDATE_CHANNEL === 'development') {
    clues.push(DEV_CLUE_LABELS.CHANNEL_ENV);
  }
  return clues;
}

export function evaluatePublishGuard(input: PublishGuardInput): PublishGuardResult {
  const channel = normalizeEasUpdateChannel(input.channel);
  if (!channel) {
    return {
      channel: null,
      canPublish: false,
      issues: [
        errorIssue(
          'UNKNOWN_CHANNEL',
          `channel must be "${EAS_UPDATE_CHANNELS.development}" or "${EAS_UPDATE_CHANNELS.production}"`,
        ),
      ],
    };
  }
  if (channel === 'development') {
    return evaluateDevelopmentGuard(input);
  }
  return evaluateProductionGuard(input);
}

function evaluateDevelopmentGuard(input: PublishGuardInput): PublishGuardResult {
  const issues: PublishGuardIssue[] = [];
  if (input.git.dirty) {
    issues.push(
      warningIssue('DIRTY_TREE', 'working tree is dirty; DEV publish still allowed'),
    );
  }
  addBinaryIssues(issues, input, 'warning');
  return { channel: 'development', canPublish: true, issues };
}

function evaluateProductionGuard(input: PublishGuardInput): PublishGuardResult {
  const issues: PublishGuardIssue[] = [];
  const clues = [
    ...(input.appVariant === 'development' ? [DEV_CLUE_LABELS.APP_VARIANT] : []),
    ...(input.extraDevClues ?? []),
  ];
  for (const clue of clues) {
    issues.push(errorIssue('DEV_CLUE', `refusing production channel: ${clue}`));
  }
  if (!PRODUCTION_PUBLISH_ALLOWED_BRANCHES.includes(input.git.branch as 'main')) {
    issues.push(
      issueForMode(
        input.dryRun,
        'BRANCH_NOT_ALLOWED',
        `production publish requires branch ${PRODUCTION_PUBLISH_ALLOWED_BRANCHES.join('|')} (current: ${input.git.branch})`,
      ),
    );
  }
  if (input.git.dirty) {
    issues.push(
      issueForMode(input.dryRun, 'DIRTY_TREE', 'production publish requires a clean git tree'),
    );
  }
  addBinaryIssues(issues, input, input.dryRun ? 'warning' : 'error');
  if (!input.allowProductionPublish) {
    issues.push(
      issueForMode(
        input.dryRun,
        'PRODUCTION_CONFIRM_REQUIRED',
        'production publish is operator-approved only (--i-know-this-publishes-production and EAS_UPDATE_ALLOW_PRODUCTION=1)',
      ),
    );
  }
  return {
    channel: 'production',
    canPublish: issues.every((item) => item.level !== 'error'),
    issues,
  };
}

function addBinaryIssues(
  issues: PublishGuardIssue[],
  input: PublishGuardInput,
  level: PublishGuardIssue['level'],
): void {
  if (!input.binaryRebuildRequired) return;
  if (input.allowBinaryMismatch) {
    issues.push(
      warningIssue(
        'BINARY_REBUILD_REQUIRED',
        'native/plugin changes detected; --allow-binary-mismatch overrides',
      ),
    );
    return;
  }
  issues.push({
    level,
    code: 'BINARY_REBUILD_REQUIRED',
    message:
      'native/plugin/config changes detected — publish an APK/AAB first, not an OTA',
  });
}

function issueForMode(
  dryRun: boolean,
  code: string,
  message: string,
): PublishGuardIssue {
  return dryRun ? warningIssue(code, message) : errorIssue(code, message);
}

function errorIssue(code: string, message: string): PublishGuardIssue {
  return { level: 'error', code, message };
}

function warningIssue(code: string, message: string): PublishGuardIssue {
  return { level: 'warning', code, message };
}

function isTruthyEnv(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}
