import assert from 'node:assert/strict';
import test from 'node:test';
import { toUploadPayload } from './profile-image-upload-payload';

test('toUploadPayload maps mime type for multipart upload', () => {
  const payload = toUploadPayload({
    uri: 'file:///cache/profile.jpg',
    mimeType: 'image/jpeg',
    fileName: 'profile.jpg',
  });
  assert.deepEqual(payload, {
    uri: 'file:///cache/profile.jpg',
    type: 'image/jpeg',
    name: 'profile.jpg',
  });
});
