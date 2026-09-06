import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canBypassIdentityVerification,
  validateIdentityVerificationBypassOnBoot,
} from './identity-verification';

test('canBypassIdentityVerification is false when JJOIN_APP_VARIANT=production', () => {
  const prev = process.env.JJOIN_APP_VARIANT;
  process.env.JJOIN_APP_VARIANT = 'production';
  try {
    assert.equal(canBypassIdentityVerification(), false);
    assert.throws(() => {
      process.env.IDENTITY_VERIFICATION_BYPASS = 'true';
      validateIdentityVerificationBypassOnBoot();
    });
  } finally {
    process.env.JJOIN_APP_VARIANT = prev;
    delete process.env.IDENTITY_VERIFICATION_BYPASS;
  }
});

test('canBypassIdentityVerification is true when JJOIN_APP_VARIANT=development', () => {
  const prev = process.env.JJOIN_APP_VARIANT;
  process.env.JJOIN_APP_VARIANT = 'development';
  try {
    assert.equal(canBypassIdentityVerification(), true);
    assert.doesNotThrow(() => validateIdentityVerificationBypassOnBoot());
  } finally {
    process.env.JJOIN_APP_VARIANT = prev;
  }
});
