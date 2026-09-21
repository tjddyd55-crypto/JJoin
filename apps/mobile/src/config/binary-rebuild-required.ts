/**
 * Path signals that an EAS Update cannot replace a new native binary.
 * Used by the pre-publish checklist — warn/fail-closed, do not auto-rebuild.
 */

const PREFIXES = [
  'apps/mobile/android/',
  'apps/mobile/ios/',
  'apps/mobile/plugins/',
  'apps/mobile/modules/',
  'apps/mobile/firebase/',
] as const;

const EXACT_FILES = [
  'apps/mobile/app.config.ts',
  'apps/mobile/app.config.js',
  'apps/mobile/app-variant-identity.cjs',
  'apps/mobile/eas.json',
  'apps/mobile/package.json',
  'apps/mobile/eas-update-policy.cjs',
] as const;

const NAME_PATTERNS = [
  /(?:^|\/)app\.plugin\.[cm]?js$/,
  /(?:^|\/)expo-module\.config\.json$/,
  /google-services/i,
  /GoogleService-Info\.plist$/,
  /AndroidManifest\.xml$/,
  /Info\.plist$/,
] as const;

export type BinaryRebuildMatch = {
  path: string;
  reason: string;
};

export function isBinaryRebuildPath(filePath: string): boolean {
  return matchBinaryRebuildPath(filePath) !== null;
}

export function matchBinaryRebuildPath(filePath: string): BinaryRebuildMatch | null {
  const normalized = filePath.replaceAll('\\', '/');
  for (const prefix of PREFIXES) {
    if (normalized === prefix.slice(0, -1) || normalized.startsWith(prefix)) {
      return { path: normalized, reason: `native tree: ${prefix}` };
    }
  }
  for (const exact of EXACT_FILES) {
    if (normalized === exact) {
      return { path: normalized, reason: `config/native SSOT: ${exact}` };
    }
  }
  for (const pattern of NAME_PATTERNS) {
    if (pattern.test(normalized)) {
      return { path: normalized, reason: `native artifact: ${pattern}` };
    }
  }
  return null;
}

export function collectBinaryRebuildMatches(filePaths: string[]): BinaryRebuildMatch[] {
  const seen = new Set<string>();
  const matches: BinaryRebuildMatch[] = [];
  for (const filePath of filePaths) {
    const match = matchBinaryRebuildPath(filePath);
    if (!match || seen.has(match.path)) continue;
    seen.add(match.path);
    matches.push(match);
  }
  return matches;
}

export function formatBinaryRebuildReport(matches: BinaryRebuildMatch[]): string {
  if (matches.length === 0) return 'OTA_SAFE: no binary-rebuild path signals';
  const lines = matches.map((match) => `- ${match.path} (${match.reason})`);
  return `BINARY_REBUILD_REQUIRED\n${lines.join('\n')}`;
}
