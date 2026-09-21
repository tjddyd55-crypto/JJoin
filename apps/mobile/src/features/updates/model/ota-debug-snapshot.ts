export type OtaDebugSnapshot = {
  binaryVersion: string;
  versionCode: number | null;
  runtimeVersion: string | null;
  updateId: string | null;
  channel: string | null;
  gitSha: string | null;
  appVariant: string;
  applicationId: string | null;
  isEmbeddedLaunch: boolean | null;
};

export type OtaDebugLine = {
  label: string;
  value: string;
};

const DISPLAY_ORDER: Array<{ key: keyof OtaDebugSnapshot; label: string }> = [
  { key: 'appVariant', label: 'APP_VARIANT' },
  { key: 'applicationId', label: 'applicationId' },
  { key: 'binaryVersion', label: 'version' },
  { key: 'versionCode', label: 'versionCode' },
  { key: 'runtimeVersion', label: 'runtimeVersion' },
  { key: 'channel', label: 'channel' },
  { key: 'updateId', label: 'updateId' },
  { key: 'gitSha', label: 'git SHA' },
  { key: 'isEmbeddedLaunch', label: 'embedded' },
];

export function formatOtaDebugValue(value: string | number | boolean | null): string {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'string' && value.trim() === '') return '—';
  return String(value);
}

export function formatOtaDebugLines(snapshot: OtaDebugSnapshot): OtaDebugLine[] {
  return DISPLAY_ORDER.map(({ key, label }) => ({
    label,
    value: formatOtaDebugValue(snapshot[key]),
  }));
}
