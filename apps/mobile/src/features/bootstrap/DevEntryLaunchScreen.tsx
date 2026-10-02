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
import {
  appLaunchBootSnapshotReady,
  readAppLaunchBootSnapshot,
} from './app-launch-boot-snapshot';
import { hideNativeSplashOnce } from './hide-native-splash-once';

export {
  DEV_ENTRY_LAUNCH_BACKGROUND,
  DEV_ENTRY_LAUNCH_MIN_MS,
  DEV_ENTRY_LAUNCH_SAFETY_MAX_MS,
  devEntryLaunchStartedAt,
} from './dev-entry-launch-timing';

type DevEntryLaunchScreenProps = {
  onHeroPainted?: () => void;
};

export function DevEntryLaunchScreen({ onHeroPainted }: DevEntryLaunchScreenProps) {
  const [cache, setCache] = useState<CachedAppLaunch | null>(() => readAppLaunchBootSnapshot());
  const embedded = useMemo(() => readEmbeddedLaunchImageSource(), []);

  useEffect(() => {
    if (cache) return;
    void appLaunchBootSnapshotReady.then(setCache);
  }, [cache]);

  useEffect(() => {
    void refreshAppLaunchCacheInBackground().then(async () => {
      const refreshed = await loadCachedAppLaunch();
      setCache(refreshed);
      setAppLaunchRuntime({
        displayDurationMs: refreshed.displayDurationMs,
        enabled: refreshed.enabled,
      });
    });
  }, []);

  const source: ImageSourcePropType = useMemo(() => {
    if (cache?.imageUri) return { uri: cache.imageUri };
    return embedded;
  }, [cache?.imageUri, embedded]);

  const onHeroLoadEnd = () => {
    if (isDevelopmentVariant()) {
      void hideNativeSplashOnce();
    }
    onHeroPainted?.();
  };

  return (
    <View style={styles.root} accessibilityRole="image" accessibilityLabel="쪼인존">
      <StatusBar hidden />
      <Image
        source={source}
        defaultSource={embedded}
        style={styles.image}
        resizeMode="cover"
        fadeDuration={0}
        onLoadEnd={onHeroLoadEnd}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

type DevEntryLaunchGateProps = {
  bootstrapping: boolean;
  children: React.ReactNode;
};

export function DevEntryLaunchGate({ bootstrapping, children }: DevEntryLaunchGateProps) {
  const enabled = isDevelopmentVariant() && isAppLaunchEnabled();
  const [overlayDismissed, setOverlayDismissed] = useState(false);

  useEffect(() => {
    if (!enabled) {
      void hideNativeSplashOnce();
      return;
    }

    const minMs = getAppLaunchDurationMs();

    const tick = () => {
      const elapsed = Date.now() - devEntryLaunchStartedAt;
      if (elapsed >= DEV_ENTRY_LAUNCH_SAFETY_MAX_MS) {
        setOverlayDismissed(true);
        return;
      }
      if (!bootstrapping && elapsed >= minMs) {
        setOverlayDismissed(true);
      }
    };

    tick();
    const id = setInterval(tick, 50);
    return () => clearInterval(id);
  }, [enabled, bootstrapping]);

  const heroVisible = enabled && !overlayDismissed;

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <View style={styles.gateRoot}>
      <View
        style={[styles.appUnderlay, heroVisible && styles.appHiddenWhileHero]}
        pointerEvents={heroVisible ? 'none' : 'auto'}
      >
        {children}
      </View>
      {heroVisible ? (
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
    backgroundColor: DEV_ENTRY_LAUNCH_BACKGROUND,
  },
  appUnderlay: {
    flex: 1,
  },
  appHiddenWhileHero: {
    opacity: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: DEV_ENTRY_LAUNCH_BACKGROUND,
  },
});
