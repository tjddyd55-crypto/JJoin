import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ExploreDiscoveryScreen } from '../../src/features/explore/discovery/ExploreDiscoveryScreen';

/** 조인 탭 — Weekly/지역 discovery (올라온 조인 찾기). */
export default function JoinsTab() {
  const { venueType } = useLocalSearchParams<{ venueType?: string }>();
  return <ExploreDiscoveryScreen initialVenueType={venueType} />;
}
