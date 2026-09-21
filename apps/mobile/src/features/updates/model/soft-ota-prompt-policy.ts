/**
 * Soft OTA UX rules — keep reload optional and never block launch.
 * Auto-reload is intentionally impossible from this module.
 */

export function shouldShowSoftOtaPrompt(input: {
  isUpdatePending: boolean;
  dismissedThisSession: boolean;
}): boolean {
  return input.isUpdatePending && !input.dismissedThisSession;
}

export function shouldAutoReloadOnLaunch(): boolean {
  return false;
}

export function shouldBlockAppEntryForOta(): boolean {
  return false;
}
