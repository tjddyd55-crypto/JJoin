import { z } from 'zod';
import test from 'node:test';
import assert from 'node:assert/strict';
import { profileSetupSchema, termsConsentSchema } from './index';

test('profile setup requires nickname and region', () => {
  const bad = profileSetupSchema.safeParse({
    nickname: 'a',
    gender: 'MALE',
    ageBand: 'THIRTIES',
    regionLabel: '',
    skillLevel: 'BEGINNER',
  });
  assert.equal(bad.success, false);

  const ok = profileSetupSchema.safeParse({
    nickname: '거제스윙',
    gender: 'MALE',
    ageBand: 'THIRTIES',
    regionLabel: '거제',
    skillLevel: 'INTERMEDIATE',
  });
  assert.equal(ok.success, true);
});

test('terms require all mandatory consents', () => {
  const bad = termsConsentSchema.safeParse({
    termsOfService: true,
    privacy: true,
    identity: false,
    location: true,
    marketing: false,
  });
  assert.equal(bad.success, false);
});
