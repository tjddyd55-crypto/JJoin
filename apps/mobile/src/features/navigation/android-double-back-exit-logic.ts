export const ANDROID_DOUBLE_BACK_EXIT_WINDOW_MS = 2000;

export type AndroidDoubleBackExitAction = 'navigate' | 'hint' | 'exit';

/** Expo Router home tab index — double-back exit applies even if stack history exists. */
export function isAndroidHomeExitRootPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  return (
    path === '/' ||
    path === '/index' ||
    path === '/(tabs)' ||
    path === '/(tabs)/index'
  );
}

export function isAndroidHomeExitRootFromSegments(segments: readonly string[]): boolean {
  if (segments[0] !== '(tabs)') return false;
  const tab = segments[1];
  return tab === undefined || tab === 'index';
}

export function resolveAndroidDoubleBackExitAction(input: {
  canGoBack: boolean;
  now: number;
  lastBackAt: number;
  windowMs?: number;
}): AndroidDoubleBackExitAction {
  if (input.canGoBack) return 'navigate';
  const windowMs = input.windowMs ?? ANDROID_DOUBLE_BACK_EXIT_WINDOW_MS;
  if (input.lastBackAt > 0 && input.now - input.lastBackAt <= windowMs) {
    return 'exit';
  }
  return 'hint';
}
