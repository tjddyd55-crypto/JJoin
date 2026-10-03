import * as SplashScreen from 'expo-splash-screen';

let hidden = false;

/** Hide the native splash only after the JS hero is ready (one seamless handoff). */
export async function hideNativeSplashOnce(): Promise<void> {
  if (hidden) return;
  hidden = true;
  await SplashScreen.hideAsync().catch(() => undefined);
}
