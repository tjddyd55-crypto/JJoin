import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Text, spacing, useTheme } from '@jjoin/design-system';
import { JoinDiscoveryProvider, useJoinDiscovery } from './JoinDiscoveryContext';
import { DiscoverListPanel } from './components/DiscoverListPanel';
import { DiscoveryFilterChrome } from './components/DiscoveryFilterChrome';
import { MapDiscoveryChrome } from './components/MapDiscoveryChrome';
import { ExploreMapScreen } from '../screens/ExploreMapScreen';
import type { MapCoordinate } from '../model/map-types';

export function ExploreDiscoveryScreen() {
  return (
    <JoinDiscoveryProvider>
      <ExploreDiscoveryBody />
    </JoinDiscoveryProvider>
  );
}

function ExploreDiscoveryBody() {
  const theme = useTheme();
  const { filter, patchFilter } = useJoinDiscovery();
  const [deviceLocation, setDeviceLocation] = useState<MapCoordinate | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const gold = theme.colors.action.primary;
  const isList = filter.view === 'LIST';

  useEffect(() => {
    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setDeviceLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      } catch {
        setLocationDenied(true);
      }
    })();
  }, []);

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.surface.base }]}
      edges={['top']}
    >
      <View style={styles.viewSwitch}>
        {(['LIST', 'MAP'] as const).map((view) => {
          const selected = filter.view === view;
          return (
            <Pressable
              key={view}
              onPress={() => patchFilter({ view })}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={view === 'LIST' ? '리스트' : '지도'}
              style={[
                styles.viewChip,
                {
                  borderColor: selected ? gold : theme.colors.border.subtle,
                  backgroundColor: selected
                    ? theme.colors.surface.card
                    : 'transparent',
                },
              ]}
            >
              <Text
                variant="meta"
                style={selected ? { color: gold } : undefined}
              >
                {view === 'LIST' ? '리스트' : '지도'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isList ? (
        <>
          <DiscoveryFilterChrome
            locationDenied={locationDenied}
            deviceLocation={deviceLocation}
          />
          <DiscoverListPanel
            locationDenied={locationDenied}
            deviceLocation={deviceLocation}
          />
        </>
      ) : (
        <>
          <MapDiscoveryChrome
            locationDenied={locationDenied}
            deviceLocation={deviceLocation}
          />
          <View style={styles.mapHost}>
            <ExploreMapScreen
              discoveryLinked
              externalLocation={deviceLocation}
              externalLocationDenied={locationDenied}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  viewSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  viewChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  mapHost: {
    flex: 1,
    minHeight: 0,
  },
});
