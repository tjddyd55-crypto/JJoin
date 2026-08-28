import React from 'react';
import { ScreenExploreScreen } from '../../src/features/explore/screen-explore/ScreenExploreScreen';

/**
 * 스크린 탭 — [지역별 | 지도] 탐색.
 * 지도 탭: 기존 GolfFacility Kakao 지도 (discoveryLinked=false).
 * 지역별 탭: 날짜 × 행정구역 기반 조인 탐색 (실험 UI).
 */
export default function ScreenTab() {
  return <ScreenExploreScreen />;
}
