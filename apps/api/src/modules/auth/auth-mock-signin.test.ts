import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MockAuthPersona, SocialProvider } from '@jjoin/types';
import { resolveMockSignInProvider } from './auth-mock-signin';

test('resolveMockSignInProvider defaults persona-only DEV sign-in to KAKAO', () => {
  assert.equal(
    resolveMockSignInProvider({ persona: MockAuthPersona.DEV_A }),
    SocialProvider.KAKAO,
  );
});

test('resolveMockSignInProvider preserves explicit provider for persona sign-in', () => {
  assert.equal(
    resolveMockSignInProvider({
      provider: SocialProvider.NAVER,
      persona: MockAuthPersona.DEV_B,
    }),
    SocialProvider.NAVER,
  );
});

test('resolveMockSignInProvider leaves scenario-only without provider unset', () => {
  assert.equal(resolveMockSignInProvider({}), undefined);
});
