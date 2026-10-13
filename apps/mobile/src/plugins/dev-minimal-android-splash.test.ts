import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('DEV minimal splash plugin overrides Android 12 splash icon theme items', () => {
  const pluginPath = path.join(repoRoot, 'plugins/dev-minimal-android-splash.plugin.cjs');
  const source = fs.readFileSync(pluginPath, 'utf8');
  assert.match(source, /windowSplashScreenAnimatedIcon/);
  assert.match(source, /dev_splash_empty_icon/);
  assert.match(source, /windowSplashScreenBehavior/);
  assert.match(source, /default/);
  assert.doesNotMatch(source, /icon_preferred/);
});
