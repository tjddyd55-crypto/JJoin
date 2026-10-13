import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { StatusBar } from 'expo-status-bar';
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
import { isDevelopmentVariant } from '../../lib/app-variant';

export {
  DEV_ENTRY_LAUNCH_BACKGROUND,
  DEV_ENTRY_LAUNCH_MIN_MS,
  DEV_ENTRY_LAUNCH_SAFETY_MAX_MS,
  devEntryLaunchStartedAt,
} from './dev-entry-launch-timing';

type DevEntryLaunchScreenProps = {
  cache: CachedAppLaunch | null;
  onHeroReady?: () => void;
};

export function DevEntryLaunchScreen({ cache, onHeroReady }: DevEntryLaunchScreenProps) {
  const embedded = useMemo(() => readEmbeddedLaunchImageSource(), []);
  const heroReadySent = useRef(false);
  const source: ImageSourcePropType = useMemo(() => {
    if (cache?.imageUri) return { uri: cache.imageUri };
    return embedded;
  }, [cache?.imageUri, embedded]);

  const notifyHeroReady = useCallback(() => {
    if (heroReadySent.current) return;
    heroReadySent.current = true;
    onHeroReady?.();
  }, [onHeroReady]);

  return (
    <View style={styles.root} accessibilityRole="image" accessibilityLabel="쪼인존">
      <StatusBar hidden />
      <Image
        source={source}
        style={styles.image}
        resizeMode="cover"
        fadeDuration={0}
        accessibilityIgnoresInvertColors
        onLoad={notifyHeroReady}
        onLoadEnd={notifyHeroReady}
      />
    </View>
  );
}

type DevEntryLaunchGateProps = {
  bootstrapping: boolean;
  children: React.ReactNode;
};

type BootLaunchCache = CachedAppLaunch | null | 'pending';

export function DevEntryLaunchGate({ bootstrapping, children }: DevEntryLaunchGateProps) {
  const enabled = isDevelopmentVariant() && isAppLaunchEnabled();
  const [launchCache, setLaunchCache] = useState<BootLaunchCache>(() => {
    const snapshot = readAppLaunchBootSnapshot();
    return snapshot ?? 'pending';
  });
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    if (launchCache !== 'pending') return;
    void appLaunchBootSnapshotReady
      .then((loaded) => setLaunchCache(loaded))
      .catch(() => setLaunchCache(null));
  }, [launchCache]);

  const launchBlocking = enabled && !overlayDismissed;
  const bootResolved = launchCache !== 'pending';
  const showHeroOverlay = launchBlocking && bootResolved;

  useEffect(() => {
    if (!enabled) {
      void hideNativeSplashOnce();
      return;
    }
    if (!showHeroOverlay || !heroReady) return;
    void hideNativeSplashOnce();
  }, [enabled, showHeroOverlay, heroReady]);

  useEffect(() => {
    if (!showHeroOverlay) {
      setHeroReady(false);
    }
  }, [showHeroOverlay]);

  useEffect(() => {
    if (!enabled) return;

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

  useEffect(() => {
    if (!overlayDismissed) return;
    void refreshAppLaunchCacheInBackground().then(async () => {
      const refreshed = await loadCachedAppLaunch();
      setAppLaunchRuntime({
        displayDurationMs: refreshed.displayDurationMs,
        enabled: refreshed.enabled,
      });
    });
  }, [overlayDismissed]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <View style={styles.gateRoot}>
      <View
        style={[styles.appUnderlay, launchBlocking && styles.appHiddenWhileHero]}
        pointerEvents={launchBlocking ? 'none' : 'auto'}
      >
        {children}
      </View>
      {showHeroOverlay ? (
        <View style={styles.overlay} pointerEvents="auto">
          <DevEntryLaunchScreen
            cache={launchCache as CachedAppLaunch | null}
            onHeroReady={() => setHeroReady(true)}
          />
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
