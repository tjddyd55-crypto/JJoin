import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { spacing, useTheme, JoinDiscoveryAppBar, JoinListTextTabs } from '@jjoin/design-system';
import { regionIdentityKey } from '@jjoin/domain';
import { JoinDiscoveryProvider, useJoinDiscovery } from './JoinDiscoveryContext';
import { DiscoverListPanel } from './components/DiscoverListPanel';
import { DiscoveryFilterChrome } from './components/DiscoveryFilterChrome';
import { MapDiscoveryChrome } from './components/MapDiscoveryChrome';
import { JoinCreateFab } from './components/JoinCreateFab';
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

function regionDisplayLabel(filter: ReturnType<typeof useJoinDiscovery>['filter']): string {
  if (filter.region.mode === 'NEARBY') return '내 주변';
  return filter.region.label?.trim() || filter.region.sigungu || '지역 선택';
}

function ExploreDiscoveryBody() {
  const theme = useTheme();
  const router = useRouter();
  const { filter, patchFilter } = useJoinDiscovery();
  const [deviceLocation, setDeviceLocation] = useState<MapCoordinate | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const isMap = filter.view === 'MAP';
  const isRegion = filter.view === 'REGION';
  const isList = !isMap && !isRegion;

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

  const listTabs = [
    { id: 'LIST', label: '리스트' },
    { id: 'REGION', label: '지역별' },
  ];

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.surface.base }]}
      edges={['top']}
    >
      {!isMap ? (
        <>
          <JoinDiscoveryAppBar
            regionLabel={regionDisplayLabel(filter)}
            onRegionPress={() => setRegionPickerOpen(true)}
            onNotificationPress={() => router.push('/my/notifications')}
          />
          <JoinListTextTabs
            tabs={listTabs}
            activeId={isRegion ? 'REGION' : 'LIST'}
            onChange={(id: string) => patchFilter({ view: id as 'LIST' | 'REGION' })}
          />
        </>
      ) : (
        <View style={styles.mapBackRow}>
          <JoinListTextTabs
            tabs={[{ id: 'LIST', label: '리스트' }]}
            activeId="LIST"
            onChange={() => patchFilter({ view: 'LIST' })}
          />
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
            regionPickerOpen={regionPickerOpen}
            onRegionPickerOpenChange={setRegionPickerOpen}
          />
          <DiscoverListPanel
            locationDenied={locationDenied}
            deviceLocation={deviceLocation}
          />
        </>
      )}
      <JoinCreateFab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mapBackRow: {
    paddingTop: spacing.xs,
  },
  mapHost: {
    flex: 1,
    minHeight: 0,
  },
});
