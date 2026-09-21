/**
 * Lightweight pre-publish checklist.
 * Warns BINARY_REBUILD_REQUIRED when native/plugin/config paths changed.
 * Does not publish and does not start an EAS/Play build.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectBinaryRebuildMatches,
  formatBinaryRebuildReport,
} from '../apps/mobile/src/config/binary-rebuild-required.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function gitNames(gitArgs: string[]): string[] {
  try {
    const output = execFileSync('git', gitArgs, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return output.split('\n').map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function listChangedFiles(): string[] {
  return [
    ...gitNames(['diff', '--name-only']),
    ...gitNames(['diff', '--name-only', '--cached']),
    ...gitNames(['diff', '--name-only', 'origin/main...HEAD']),
  ];
}

const matches = collectBinaryRebuildMatches(listChangedFiles());
const report = formatBinaryRebuildReport(matches);
console.log(report);
if (matches.length > 0) {
  console.log(
    'OTA cannot replace native changes. Build a new development/preview/production binary first.',
  );
}
