import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { resolveAppVariant } from '../../../lib/app-variant';
import type { OtaDebugSnapshot } from '../model/ota-debug-snapshot';

type ExtraWithGit = {
  gitSha?: string;
};

export function readOtaDebugSnapshot(applicationId: string | null): OtaDebugSnapshot {
  const extra = Constants.expoConfig?.extra as ExtraWithGit | undefined;
  const versionCode = Constants.expoConfig?.android?.versionCode;
  return {
    binaryVersion: Constants.expoConfig?.version ?? '—',
    versionCode: typeof versionCode === 'number' ? versionCode : null,
    runtimeVersion: Updates.runtimeVersion ?? readRuntimeVersionFromConfig(),
    updateId: Updates.updateId,
    channel: Updates.channel ?? readConfiguredChannel(),
    gitSha: extra?.gitSha?.trim() || null,
    appVariant: resolveAppVariant(),
    applicationId,
    isEmbeddedLaunch: Updates.isEnabled ? Updates.isEmbeddedLaunch : null,
  };
}

function readRuntimeVersionFromConfig(): string | null {
  const runtime = Constants.expoConfig?.runtimeVersion;
  return typeof runtime === 'string' ? runtime : Constants.expoConfig?.version ?? null;
}

function readConfiguredChannel(): string | null {
  const headers = Constants.expoConfig?.updates?.requestHeaders;
  const fromHeader = headers?.['expo-channel-name'];
  return typeof fromHeader === 'string' ? fromHeader : null;
}
