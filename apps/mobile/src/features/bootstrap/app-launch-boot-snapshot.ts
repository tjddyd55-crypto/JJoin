import type { CachedAppLaunch } from './app-launch-cache';
import { loadCachedAppLaunch } from './app-launch-cache';
import { setAppLaunchRuntime } from './app-launch-runtime';

/** Eager cold-start read so the first hero frame uses the cached admin image when available. */
let snapshot: CachedAppLaunch | null = null;

export const appLaunchBootSnapshotReady: Promise<CachedAppLaunch> = loadCachedAppLaunch().then(
  (loaded) => {
    snapshot = loaded;
    setAppLaunchRuntime({
      displayDurationMs: loaded.displayDurationMs,
      enabled: loaded.enabled,
    });
    return loaded;
  },
);

export function readAppLaunchBootSnapshot(): CachedAppLaunch | null {
  return snapshot;
}
