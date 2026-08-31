/**
 * Nested Stack screens already sit under a navigation AppBar.
 * Omit top safe-area so content starts compactly below the header
 * (avoids AppBar + SafeArea + duplicate H1 vertical waste).
 *
 * Tab ROOT screens keep default ScreenFrame edges (include top).
 */
export const NESTED_SCREEN_EDGES = ['left', 'right', 'bottom'] as const;
