const {
  withAndroidManifest,
  withInfoPlist,
  createRunOncePlugin,
} = require('@expo/config-plugins');

/**
 * Toss WebView App-to-App package visibility + iOS query schemes.
 * SSOT for payment card/bank app redirects — do not edit generated android/ios.
 * Source: https://docs.tosspayments.com/guides/v2/webview
 */

const ANDROID_PACKAGES = [
  'viva.republica.toss',
  'com.kakao.talk',
  'com.nhn.android.search',
  'com.samsung.android.spay',
  'com.samsung.android.spaylite',
  'kr.co.samsungcard.mpocket',
  'com.samsung.android.monimo',
  'com.hyundaicard.appcard',
  'com.lumensoft.touchenappfree',
  'com.shinhan.smartcaremgr',
  'com.shcard.smartpay',
  'com.kbcard.cxh.appcard',
  'com.kbstar.liivbank',
  'com.kbstar.reboot',
  'com.lcacApp',
  'com.hanaskcard.paycla',
  'com.hanaskcard.rocomo.potal',
  'nh.smart.nhallonepay',
  'com.wooricard.smartapp',
  'com.wooribank.smart.npib',
  'kr.co.citibank.citimobile',
  'com.lotte.lottesmartpay',
  'com.lottemembers.android',
  'com.nhnent.payapp',
  'com.ssg.serviceapp.android.egiftcertificate',
  'com.kakaobank.channel',
  'kvp.jjy.MispAndroid320',
];

const ANDROID_SCHEMES = [
  'supertoss',
  'kb-acp',
  'liivbank',
  'newliiv',
  'kbbank',
  'nhappcardansimclick',
  'nhallonepayansimclick',
  'nonghyupcardansimclick',
  'lottesmartpay',
  'lotteappcard',
  'mpocket.online.ansimclick',
  'mpocket.ansimclick.cert',
  'vguardstart',
  'samsungpay',
  'monimopay',
  'monimopayauth',
  'shinhan-sr-ansimclick',
  'smshinhanansimclick',
  'com.wooricard.wcard',
  'newsmartpib',
  'citispay',
  'citicardappkr',
  'citimobileapp',
  'cloudpay',
  'hanawalletmembers',
  'hdcardappcardansimclick',
  'smhyundaiansimclick',
  'shinsegaeeasypayment',
  'payco',
  'lpayapp',
  'ispmobile',
  'kakaobank',
  'market',
  'intent',
];

const IOS_SCHEMES = [...ANDROID_SCHEMES.filter((s) => s !== 'intent' && s !== 'market')];

function ensureQueries(manifest) {
  if (!manifest.queries) {
    manifest.queries = [{}];
  }
  const queries = manifest.queries[0];
  if (!queries.package) queries.package = [];
  if (!queries.intent) queries.intent = [];

  const existingPackages = new Set(
    queries.package.map((p) => p?.$?.['android:name']).filter(Boolean),
  );
  for (const name of ANDROID_PACKAGES) {
    if (existingPackages.has(name)) continue;
    queries.package.push({ $: { 'android:name': name } });
    existingPackages.add(name);
  }

  const existingSchemes = new Set();
  for (const intent of queries.intent) {
    const data = intent?.data;
    if (!Array.isArray(data)) continue;
    for (const d of data) {
      const scheme = d?.$?.['android:scheme'];
      if (scheme) existingSchemes.add(scheme);
    }
  }

  for (const scheme of ANDROID_SCHEMES) {
    if (existingSchemes.has(scheme)) continue;
    queries.intent.push({
      action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
      data: [{ $: { 'android:scheme': scheme } }],
    });
    existingSchemes.add(scheme);
  }

  return manifest;
}

function withTossPaymentQueries(config) {
  config = withAndroidManifest(config, (cfg) => {
    cfg.modResults.manifest = ensureQueries(cfg.modResults.manifest);
    return cfg;
  });

  config = withInfoPlist(config, (cfg) => {
    const existing = cfg.modResults.LSApplicationQueriesSchemes ?? [];
    const merged = Array.from(new Set([...existing, ...IOS_SCHEMES]));
    cfg.modResults.LSApplicationQueriesSchemes = merged;
    return cfg;
  });

  return config;
}

module.exports = createRunOncePlugin(
  withTossPaymentQueries,
  'jjoin-toss-payment-queries',
  '1.0.0',
);
