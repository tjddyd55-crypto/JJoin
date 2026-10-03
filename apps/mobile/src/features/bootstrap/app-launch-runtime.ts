import { DEV_ENTRY_LAUNCH_MIN_MS } from './dev-entry-launch-timing';

let launchDurationMs = DEV_ENTRY_LAUNCH_MIN_MS;
let launchEnabled = true;

export function setAppLaunchRuntime(options: {
  displayDurationMs?: number;
  enabled?: boolean;
}): void {
  if (options.displayDurationMs != null && Number.isFinite(options.displayDurationMs)) {
    launchDurationMs = options.displayDurationMs;
  }
  if (options.enabled != null) launchEnabled = options.enabled;
}

export function getAppLaunchDurationMs(): number {
  return launchDurationMs;
}

export function isAppLaunchEnabled(): boolean {
  return launchEnabled;
}
