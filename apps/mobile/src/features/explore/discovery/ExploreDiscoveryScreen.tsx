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
import { RegionJoinExploreScreen } from '../region-explore/RegionJoinExploreScreen';
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
  const isMap = filter.view === 'MAP';
  const isRegion = filter.view === 'REGION';

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
      {!isMap ? (
        <View style={styles.viewSwitch}>
          {(
            [
              { id: 'LIST' as const, label: '리스트' },
              { id: 'REGION' as const, label: '지역별' },
            ] as const
          ).map((item) => {
            const selected = filter.view === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => patchFilter({ view: item.id })}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={item.label}
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
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.mapBackRow}>
          <Pressable
            onPress={() => patchFilter({ view: 'LIST' })}
            accessibilityRole="button"
            accessibilityLabel="리스트로 돌아가기"
            hitSlop={8}
          >
            <Text variant="meta" style={{ color: gold }}>
              {'\u2039'} 리스트
            </Text>
          </Pressable>
        </View>
      )}

      {isRegion ? (
        <RegionJoinExploreScreen
          embedded
          onSwitchToMap={() => patchFilter({ view: 'MAP' })}
        />
      ) : isMap ? (
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
      ) : (
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  viewChip: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: spacing.sm,
  },
  mapBackRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  mapHost: {
    flex: 1,
    minHeight: 0,
  },
});
