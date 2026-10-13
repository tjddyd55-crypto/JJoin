/** DEV standalone first impression — fullscreen hero, ~2s before main UI. */
export const DEV_ENTRY_LAUNCH_MIN_MS = 2000;
export const DEV_ENTRY_LAUNCH_SAFETY_MAX_MS = 4000;

/** Matches native splash + hero underlay to avoid white/green flash between layers. */
export const DEV_ENTRY_LAUNCH_BACKGROUND = '#1a2e1a';

/** Single cold-start clock so bootstrap + overlay share one minimum display window. */
export const devEntryLaunchStartedAt = Date.now();
