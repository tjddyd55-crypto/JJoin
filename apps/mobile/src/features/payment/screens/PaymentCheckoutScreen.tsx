import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import { Button, Spacer, Text, useTheme } from '@jjoin/design-system';
import type { CreatePaymentOrderResponse } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore, useSession } from '../../../session/SessionContext';
import { parsePaymentCallbackUrl } from '../payment-checkout-callback';
import {
  classifyCheckoutNavigation,
  resolveExternalOpenUrl,
  shouldLoadInWebView,
} from '../payment-checkout-external-nav';
import { confirmPaymentFromCallback } from '../payment-checkout';

type CheckoutPhase = 'creating_order' | 'loading_webview' | 'confirming' | 'load_error';

type PaymentReturnRoute = 'coin-charge' | 'premium';

function isWebViewReturnUrl(url: string): boolean {
  return url.includes('/payments/toss/webview-return');
}

function isAppSchemeCallback(
  url: string,
  order: CreatePaymentOrderResponse,
): boolean {
  return (
    url.startsWith(order.successRedirectScheme) ||
    url.startsWith(order.failRedirectScheme)
  );
}

async function openExternalPaymentUrl(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    // App missing / unresolved — user stays on checkout; do not crash WebView.
  }
}

export function PaymentCheckoutScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { refreshMe } = useSession();
  const params = useLocalSearchParams<{ productId?: string; returnTo?: string }>();
  const productId = params.productId ?? '';
  const returnTo = (params.returnTo === 'premium' ? 'premium' : 'coin-charge') as PaymentReturnRoute;

  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);

  const [phase, setPhase] = useState<CheckoutPhase>('creating_order');
  const [order, setOrder] = useState<CreatePaymentOrderResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handledCallbackRef = useRef(false);
  const orderRef = useRef<CreatePaymentOrderResponse | null>(null);

  const closeWithCancel = useCallback(() => {
    const current = orderRef.current;
    if (current?.paymentId) {
      void api.cancelReadyPayment(current.paymentId).catch(() => {
        // Already canceled / superseded — ignore.
      });
    }
    router.back();
  }, [api, router]);

  const finishSuccess = useCallback(
    async (result: Awaited<ReturnType<typeof confirmPaymentFromCallback>>) => {
      if (!result.ok) return;
      await refreshMe();

      if (returnTo === 'coin-charge') {
        const wallet = await api.getWallet();
        router.replace({
          pathname: '/my/coin-charge',
          params: {
            successCoin: result.data.coinCredited ?? '0',
            successBalance: wallet.availableCoin,
          },
        });
        return;
      }

      router.replace({
        pathname: '/my/premium',
        params: { paymentSuccess: '1' },
      });
    },
    [api, refreshMe, returnTo, router],
  );

  const handleCallbackUrl = useCallback(
    async (url: string) => {
      const currentOrder = orderRef.current;
      if (!currentOrder || handledCallbackRef.current) return false;

      const webviewReturn = isWebViewReturnUrl(url);
      const appScheme = isAppSchemeCallback(url, currentOrder);
      if (!webviewReturn && !appScheme) return false;

      handledCallbackRef.current = true;
      setPhase('confirming');

      const failed =
        (webviewReturn && url.includes('outcome=fail')) ||
        url.startsWith(currentOrder.failRedirectScheme);

      if (failed) {
        router.replace({
          pathname: returnTo === 'premium' ? '/my/premium' : '/my/coin-charge',
          params: { paymentError: 'cancelled' },
        });
        return true;
      }

      const callback = parsePaymentCallbackUrl(url);
      if (!callback || !callback.paymentKey || callback.failed) {
        setLoadError('결제 정보를 확인하지 못했습니다.');
        setPhase('load_error');
        handledCallbackRef.current = false;
        return true;
      }

      const confirmed = await confirmPaymentFromCallback(api, callback);
      if (!confirmed.ok) {
        setLoadError('결제를 완료하지 못했습니다. 다시 시도해주세요.');
        setPhase('load_error');
        handledCallbackRef.current = false;
        return true;
      }

      await finishSuccess(confirmed);
      return true;
    },
    [api, finishSuccess, returnTo, router],
  );

  const handleExternalNavigation = useCallback((url: string): boolean => {
    const decision = classifyCheckoutNavigation(url);
    if (shouldLoadInWebView(decision)) return true;

    if (decision.kind === 'merchant_callback') {
      void handleCallbackUrl(url);
      return false;
    }

    if (decision.kind === 'block') {
      return false;
    }

    const openUrl = resolveExternalOpenUrl(decision);
    if (openUrl) {
      void openExternalPaymentUrl(openUrl);
    } else if (decision.fallbackUrl) {
      void openExternalPaymentUrl(decision.fallbackUrl);
    }
    return false;
  }, [handleCallbackUrl]);

  const onShouldStartLoadWithRequest = useCallback(
    (request: ShouldStartLoadRequest) => {
      const url = request.url;
      const currentOrder = orderRef.current;
      if (currentOrder) {
        if (isWebViewReturnUrl(url) || isAppSchemeCallback(url, currentOrder)) {
          void handleCallbackUrl(url);
          return false;
        }
      }
      return handleExternalNavigation(url);
    },
    [handleCallbackUrl, handleExternalNavigation],
  );

  const onNavigationStateChange = useCallback(
    (event: WebViewNavigation) => {
      const url = event.url;
      if (isWebViewReturnUrl(url)) {
        void handleCallbackUrl(url);
        return;
      }
      const decision = classifyCheckoutNavigation(url);
      if (!shouldLoadInWebView(decision) && decision.kind !== 'merchant_callback') {
        handleExternalNavigation(url);
      } else {
        void handleCallbackUrl(url);
      }
    },
    [handleCallbackUrl, handleExternalNavigation],
  );

  const onOpenWindow = useCallback(
    (syntheticEvent: { nativeEvent: { targetUrl: string } }) => {
      const targetUrl = syntheticEvent.nativeEvent.targetUrl;
      if (!targetUrl) return;
      if (isWebViewReturnUrl(targetUrl)) {
        void handleCallbackUrl(targetUrl);
        return;
      }
      handleExternalNavigation(targetUrl);
    },
    [handleCallbackUrl, handleExternalNavigation],
  );

  useEffect(() => {
    if (!productId) {
      setLoadError('결제 상품 정보가 없습니다.');
      setPhase('load_error');
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const created = await api.createPaymentOrder({ productId });
        if (cancelled) return;
        const withWebViewCallback: CreatePaymentOrderResponse = {
          ...created,
          checkoutUrl: created.checkoutUrl.includes('?')
            ? `${created.checkoutUrl}&callback=webview`
            : `${created.checkoutUrl}?callback=webview`,
        };
        orderRef.current = withWebViewCallback;
        setOrder(withWebViewCallback);
        setPhase('loading_webview');
      } catch {
        if (cancelled) return;
        setLoadError('결제 주문을 만들지 못했습니다.');
        setPhase('load_error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, productId]);

  if (phase === 'creating_order' || phase === 'confirming') {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.app.background }]}>
        <ActivityIndicator size="large" color={theme.colors.action.primary} />
        <Spacer size="md" />
        <Text variant="body" tone="secondary">
          {phase === 'confirming' ? '결제를 확인하는 중입니다…' : '결제 화면을 준비하는 중입니다…'}
        </Text>
      </View>
    );
  }

  if (phase === 'load_error' || !order) {
    return (
      <View style={[styles.centered, styles.pad, { backgroundColor: theme.colors.app.background }]}>
        <Text variant="sectionTitle">결제를 진행할 수 없습니다</Text>
        <Spacer size="sm" />
        <Text variant="body" tone="secondary">
          {loadError ?? '결제 화면을 불러오지 못했습니다.'}
        </Text>
        <Spacer size="lg" />
        <Button
          label="다시 시도"
          onPress={() =>
            router.replace({
              pathname: '/my/payment-checkout',
              params: { productId, returnTo },
            })
          }
        />
        <Spacer size="sm" />
        <Button label="닫기" variant="secondary" onPress={closeWithCancel} />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.app.background }]}>
      <WebView
        source={{ uri: order.checkoutUrl }}
        originWhitelist={[
          'https://*',
          'http://*',
          'jjoin://*',
          'jjoindev://*',
          'intent://*',
          'market://*',
          'mpocket.online.ansimclick://*',
          'mpocket.ansimclick.cert://*',
          'monimopay://*',
          'monimopayauth://*',
          'samsungpay://*',
          'supertoss://*',
          'ispmobile://*',
        ]}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onNavigationStateChange={onNavigationStateChange}
        onOpenWindow={onOpenWindow}
        onError={() => {
          setLoadError('결제 화면을 불러오지 못했습니다.');
          setPhase('load_error');
        }}
        onHttpError={() => {
          setLoadError('결제 화면을 불러오지 못했습니다.');
          setPhase('load_error');
        }}
        startInLoadingState
        renderLoading={() => (
          <View style={[styles.centered, styles.loadingOverlay]}>
            <ActivityIndicator size="large" color={theme.colors.action.primary} />
          </View>
        )}
        /**
         * Card issuers may use window.open for auth. Keep single WebView document
         * and route the target URL through our classifier (App-to-App / https).
         */
        setSupportMultipleWindows={true}
        javaScriptCanOpenWindowsAutomatically
        sharedCookiesEnabled
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pad: { paddingHorizontal: 24 },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15,20,25,0.6)',
  },
});
