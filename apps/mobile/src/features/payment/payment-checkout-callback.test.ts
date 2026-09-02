import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isAllowedCheckoutNavigation,
  matchPaymentCallbackUrl,
  parsePaymentCallbackUrl,
} from './payment-checkout-callback';

const API = 'https://api-development-e387.up.railway.app';

test('parsePaymentCallbackUrl extracts paymentKey orderId amount', () => {
  const parsed = parsePaymentCallbackUrl(
    'jjoindev://payment/success?paymentKey=pay_test_abc&orderId=JJ123&amount=10000',
  );
  assert.ok(parsed);
  assert.equal(parsed.paymentKey, 'pay_test_abc');
  assert.equal(parsed.orderId, 'JJ123');
  assert.equal(parsed.amount, 10000);
  assert.equal(parsed.failed, false);
});

test('matchPaymentCallbackUrl detects success and fail prefixes', () => {
  const success = matchPaymentCallbackUrl(
    'jjoindev://payment/success?paymentKey=pay_ok&orderId=JJ1&amount=9900',
    'jjoindev://payment/success',
    'jjoindev://payment/fail',
  );
  assert.equal(success.kind, 'success');

  const fail = matchPaymentCallbackUrl(
    'jjoindev://payment/fail?paymentKey=pay_x&orderId=JJ1&amount=9900&code=USER_CANCEL',
    'jjoindev://payment/success',
    'jjoindev://payment/fail',
  );
  assert.equal(fail.kind, 'fail');
});

test('isAllowedCheckoutNavigation allows API and Toss hosts only', () => {
  assert.equal(
    isAllowedCheckoutNavigation(`${API}/payments/toss/checkout-page?token=abc`, API),
    true,
  );
  assert.equal(
    isAllowedCheckoutNavigation('https://payment-gateway-sandbox.tosspayments.com/pc', API),
    true,
  );
  assert.equal(
    isAllowedCheckoutNavigation('https://js.tosspayments.com/v2/standard', API),
    true,
  );
  assert.equal(isAllowedCheckoutNavigation('https://evil.example.com/phish', API), false);
});
