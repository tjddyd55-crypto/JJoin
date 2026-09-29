import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { isDevelopmentVariant } from '../../lib/app-variant';
import {
  DEV_ENTRY_LAUNCH_BACKGROUND,
  DEV_ENTRY_LAUNCH_MIN_MS,
  DEV_ENTRY_LAUNCH_SAFETY_MAX_MS,
  devEntryLaunchStartedAt,
} from './dev-entry-launch-timing';

export {
  DEV_ENTRY_LAUNCH_BACKGROUND,
  DEV_ENTRY_LAUNCH_MIN_MS,
  DEV_ENTRY_LAUNCH_SAFETY_MAX_MS,
  devEntryLaunchStartedAt,
} from './dev-entry-launch-timing';

const launchImage = require('../../../assets/images/dev-entry-launch.png');

export function DevEntryLaunchScreen() {
  return (
    <View style={styles.root} accessibilityRole="image" accessibilityLabel="쪼인존">
      <StatusBar hidden />
      <Image source={launchImage} style={styles.image} resizeMode="cover" accessibilityIgnoresInvertColors />
    </View>
  );
}

type DevEntryLaunchGateProps = {
  bootstrapping: boolean;
  children: React.ReactNode;
};

/**
 * Development-only overlay: keeps the hero visible until session bootstrap finishes
 * and a short minimum display time passes (without blocking bootstrap work).
 */
export function DevEntryLaunchGate({ bootstrapping, children }: DevEntryLaunchGateProps) {
  const enabled = isDevelopmentVariant();
  const [showOverlay, setShowOverlay] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setShowOverlay(false);
      return;
    }

    const tick = () => {
      const elapsed = Date.now() - devEntryLaunchStartedAt;
      if (elapsed >= DEV_ENTRY_LAUNCH_SAFETY_MAX_MS) {
        setShowOverlay(false);
        return;
      }
      if (!bootstrapping && elapsed >= DEV_ENTRY_LAUNCH_MIN_MS) {
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
