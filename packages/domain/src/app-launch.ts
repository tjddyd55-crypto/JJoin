export const APP_LAUNCH_DURATION_MIN_MS = 500;
export const APP_LAUNCH_DURATION_MAX_MS = 5000;
export const APP_LAUNCH_DURATION_DEFAULT_MS = 2000;

export function clampAppLaunchDurationMs(value: number): number {
  if (!Number.isFinite(value)) return APP_LAUNCH_DURATION_DEFAULT_MS;
  const rounded = Math.round(value);
  return Math.min(APP_LAUNCH_DURATION_MAX_MS, Math.max(APP_LAUNCH_DURATION_MIN_MS, rounded));
}

export function buildAppLaunchObjectKey(params: {
  environmentPrefix: 'development' | 'production';
  fileId: string;
  extension: 'jpg' | 'png' | 'webp';
}): string {
  const ext = params.extension === 'jpg' ? 'jpg' : params.extension;
  return `${params.environmentPrefix}/app-launch/${params.fileId}.${ext}`;
}
