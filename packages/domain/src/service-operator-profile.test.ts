import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyServiceOperatorTemplate,
  assessServiceOperatorCompleteness,
  formatBusinessRegistrationNumber,
  normalizeServiceOperatorProfile,
  validateServiceOperatorProfileUpdate,
} from './service-operator-profile';

test('normalizeBusinessRegistrationNumber strips separators', () => {
  const normalized = normalizeServiceOperatorProfile({
    businessRegistrationNumber: '123-45-67890',
  });
  assert.equal(normalized.businessRegistrationNumber, '1234567890');
  assert.equal(formatBusinessRegistrationNumber('1234567890'), '123-45-67890');
});

test('validate rejects invalid email and short phone', () => {
  const badEmail = validateServiceOperatorProfileUpdate({
    customerServiceEmail: 'not-an-email',
  });
  assert.equal(badEmail.ok, false);

  const badPhone = validateServiceOperatorProfileUpdate({
    customerServicePhone: '123',
  });
  assert.equal(badPhone.ok, false);
});

test('applyServiceOperatorTemplate substitutes and drops empty lines', () => {
  const profile = normalizeServiceOperatorProfile({
    businessName: '테스트 주식회사',
    representativeName: '홍길동',
    businessRegistrationNumber: '1234567890',
  });
  const body = applyServiceOperatorTemplate(
    '상호: {{businessName}}\n대표: {{representativeName}}\n사업자번호: {{businessRegistrationNumber}}\n통신판매업: {{ecommerceRegistrationNumber}}',
    profile,
  );
  assert.match(body, /테스트 주식회사/);
  assert.match(body, /123-45-67890/);
  assert.doesNotMatch(body, /통신판매업/);
});

test('assessServiceOperatorCompleteness lists missing production fields', () => {
  const profile = normalizeServiceOperatorProfile({ brandName: 'JJOINZONE' });
  const result = assessServiceOperatorCompleteness(profile);
  assert.equal(result.complete, false);
  assert.ok(result.missingLabels.includes('상호 / 법인명'));
});
