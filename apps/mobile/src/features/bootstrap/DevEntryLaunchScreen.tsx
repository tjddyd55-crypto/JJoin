import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { isDevelopmentVariant } from '../../lib/app-variant';
import {
  DEV_ENTRY_LAUNCH_BACKGROUND,
  DEV_ENTRY_LAUNCH_SAFETY_MAX_MS,
  devEntryLaunchStartedAt,
} from './dev-entry-launch-timing';
import {
  getAppLaunchDurationMs,
  isAppLaunchEnabled,
  setAppLaunchRuntime,
} from './app-launch-runtime';
import {
  loadCachedAppLaunch,
  readEmbeddedLaunchImageSource,
  refreshAppLaunchCacheInBackground,
  type CachedAppLaunch,
} from './app-launch-cache';

export {
  DEV_ENTRY_LAUNCH_BACKGROUND,
  DEV_ENTRY_LAUNCH_MIN_MS,
  DEV_ENTRY_LAUNCH_SAFETY_MAX_MS,
  devEntryLaunchStartedAt,
} from './dev-entry-launch-timing';

export function DevEntryLaunchScreen() {
  const [cache, setCache] = useState<CachedAppLaunch | null>(null);

  useEffect(() => {
    void loadCachedAppLaunch().then((loaded) => {
      setCache(loaded);
      setAppLaunchRuntime({
        displayDurationMs: loaded.displayDurationMs,
        enabled: loaded.enabled,
      });
    });
    void refreshAppLaunchCacheInBackground();
  }, []);

  const source: ImageSourcePropType = useMemo(() => {
    if (cache?.imageUri) return { uri: cache.imageUri };
    return readEmbeddedLaunchImageSource();
  }, [cache?.imageUri]);

  return (
    <View style={styles.root} accessibilityRole="image" accessibilityLabel="쪼인존">
      <StatusBar hidden />
      <Image source={source} style={styles.image} resizeMode="cover" accessibilityIgnoresInvertColors />
    </View>
  );
}

type DevEntryLaunchGateProps = {
  bootstrapping: boolean;
  children: React.ReactNode;
};

export function DevEntryLaunchGate({ bootstrapping, children }: DevEntryLaunchGateProps) {
  const enabled = isDevelopmentVariant() && isAppLaunchEnabled();
  const [showOverlay, setShowOverlay] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setShowOverlay(false);
      return;
    }

    const minMs = getAppLaunchDurationMs();

    const tick = () => {
      const elapsed = Date.now() - devEntryLaunchStartedAt;
      if (elapsed >= DEV_ENTRY_LAUNCH_SAFETY_MAX_MS) {
        setShowOverlay(false);
        return;
      }
      if (!bootstrapping && elapsed >= minMs) {
        setShowOverlay(false);
      }
    };

    tick();
    const id = setInterval(tick, 50);
    return () => clearInterval(id);
  }, [enabled, bootstrapping]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <View style={styles.gateRoot}>
      {children}
      {showOverlay ? (
        <View style={styles.overlay} pointerEvents="auto">
          <DevEntryLaunchScreen />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DEV_ENTRY_LAUNCH_BACKGROUND,
  },
  image: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  gateRoot: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
  },
});
