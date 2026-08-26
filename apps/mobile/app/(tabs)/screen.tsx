import React from 'react';
import { ExploreMapScreen } from '../../src/features/explore/screens/ExploreMapScreen';

/**
 * 스크린 탭 — GolfFacility 지도/검색 (조인 유무와 무관하게 매장 탐색).
 * discovery 필터와 상태 분리: discoveryLinked=false.
 */
export default function ScreenTab() {
  return <ExploreMapScreen />;
}
