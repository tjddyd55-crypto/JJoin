import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isPublishableAndroidRelease,
  normalizeHttpsApkUrl,
  shouldForceAndroidUpdate,
  validateMobileAndroidReleaseUpdate,
} from './mobile-android-release';

test('shouldForceAndroidUpdate uses versionCode only', () => {
  assert.equal(shouldForceAndroidUpdate(6, 7), true);
  assert.equal(shouldForceAndroidUpdate(7, 7), false);
  assert.equal(shouldForceAndroidUpdate(8, 7), false);
  assert.equal(shouldForceAndroidUpdate(6, 0), false);
});

test('normalizeHttpsApkUrl rejects non-https', () => {
  assert.throws(() => normalizeHttpsApkUrl('http://example.com/app.apk'));
  assert.equal(
    normalizeHttpsApkUrl('https://cdn.example.com/jjoin.apk'),
    'https://cdn.example.com/jjoin.apk',
  );
});

test('validateMobileAndroidReleaseUpdate trims and validates fields', () => {
  const patch = validateMobileAndroidReleaseUpdate({
    latestVersionCode: 7,
    latestVersionName: ' 0.0.7 ',
    apkUrl: 'https://cdn.example.com/app.apk',
    releaseNotes: ' bug fixes ',
  });
  assert.equal(patch.latestVersionName, '0.0.7');
  assert.equal(patch.releaseNotes, 'bug fixes');
});

test('isPublishableAndroidRelease requires positive code and https apk', () => {
  assert.equal(
    isPublishableAndroidRelease({
      latestVersionCode: 7,
      latestVersionName: '0.0.7',
      apkUrl: 'https://cdn.example.com/app.apk',
      releaseNotes: null,
      publishedAt: null,
    }),
    true,
  );
  assert.equal(
    isPublishableAndroidRelease({
      latestVersionCode: 0,
      latestVersionName: '0.0.0',
      apkUrl: '',
      releaseNotes: null,
      publishedAt: null,
    }),
    false,
  );
});
