export const ANDROID_DOUBLE_BACK_EXIT_WINDOW_MS = 2000;

export type AndroidDoubleBackExitAction = 'navigate' | 'hint' | 'exit';

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
