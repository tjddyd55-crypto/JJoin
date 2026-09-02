import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyCheckoutNavigation,
  convertAndroidIntentUrl,
  resolveExternalOpenUrl,
  shouldLoadInWebView,
} from './payment-checkout-external-nav';

test('http/https load inside WebView', () => {
  const https = classifyCheckoutNavigation(
    'https://payment-gateway-sandbox.tosspayments.com/pc',
  );
  assert.equal(https.kind, 'webview_http');
  assert.equal(shouldLoadInWebView(https), true);

  const cardHost = classifyCheckoutNavigation('https://www.samsungcard.co.kr/auth');
  assert.equal(cardHost.kind, 'webview_http');
  assert.equal(shouldLoadInWebView(cardHost), true);
});

test('jjoindev merchant callback is not loaded in WebView', () => {
  const d = classifyCheckoutNavigation(
    'jjoindev://payment/success?paymentKey=pk&orderId=JJ1&amount=10000',
  );
  assert.equal(d.kind, 'merchant_callback');
  assert.equal(shouldLoadInWebView(d), false);
});

test('intent:// converts to Samsung mpocket app link', () => {
  const intent =
    'intent://pay#Intent;scheme=mpocket.online.ansimclick;package=kr.co.samsungcard.mpocket;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dkr.co.samsungcard.mpocket;end';
  const converted = convertAndroidIntentUrl(intent);
  assert.equal(converted.scheme, 'mpocket.online.ansimclick');
  assert.equal(converted.packageName, 'kr.co.samsungcard.mpocket');
  assert.equal(converted.appLink, 'mpocket.online.ansimclick://pay');
  assert.ok(converted.fallbackUrl?.startsWith('https://play.google.com'));

  const decision = classifyCheckoutNavigation(intent);
  assert.equal(decision.kind, 'intent');
  assert.equal(shouldLoadInWebView(decision), false);
  assert.equal(resolveExternalOpenUrl(decision), 'mpocket.online.ansimclick://pay');
});

test('known payment scheme opens externally', () => {
  const d = classifyCheckoutNavigation('monimopay://auth/start');
  assert.equal(d.kind, 'payment_app');
  assert.equal(d.scheme, 'monimopay');
  assert.equal(resolveExternalOpenUrl(d), 'monimopay://auth/start');
});

test('market:// opens store', () => {
  const d = classifyCheckoutNavigation('market://details?id=kr.co.samsungcard.mpocket');
  assert.equal(d.kind, 'market');
  assert.equal(resolveExternalOpenUrl(d), 'market://details?id=kr.co.samsungcard.mpocket');
});

test('unknown scheme is blocked', () => {
  const d = classifyCheckoutNavigation('evilpay://steal');
  assert.equal(d.kind, 'block');
  assert.equal(resolveExternalOpenUrl(d), null);
  assert.equal(shouldLoadInWebView(d), false);
});
