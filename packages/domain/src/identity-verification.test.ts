import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IdentityStatus } from '@jjoin/types';
import {
  assertIdentityVerificationBypassAllowed,
  isIdentityVerificationBypassEnabled,
  requiresIdentityGate,
} from './identity-verification';

test('isIdentityVerificationBypassEnabled only in development', () => {
  assert.equal(isIdentityVerificationBypassEnabled('development'), true);
  assert.equal(isIdentityVerificationBypassEnabled('production'), false);
});

test('requiresIdentityGate blocks unverified in production', () => {
  assert.equal(requiresIdentityGate(IdentityStatus.UNVERIFIED, 'CREATE_JOIN'), true);
  assert.equal(requiresIdentityGate(IdentityStatus.UNVERIFIED, 'APPLY_JOIN'), true);
  assert.equal(requiresIdentityGate(IdentityStatus.VERIFIED, 'APPLY_JOIN'), false);
});

test('requiresIdentityGate bypasses in development without changing verified check', () => {
  assert.equal(
    requiresIdentityGate(IdentityStatus.UNVERIFIED, 'CREATE_JOIN', { appVariant: 'development' }),
    false,
  );
  assert.equal(
    requiresIdentityGate(IdentityStatus.VERIFIED, 'APPLY_JOIN', { appVariant: 'development' }),
    false,
  );
});

test('production fail-safe rejects explicit bypass request', () => {
  assert.throws(() =>
    assertIdentityVerificationBypassAllowed('production', true),
  );
  assert.doesNotThrow(() =>
    assertIdentityVerificationBypassAllowed('development', true),
  );
});
