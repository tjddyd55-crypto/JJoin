import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Legacy Explore alias.
 * - venuePick → 스크린 탭 (장소 선택)
 * - 그 외 → 조인 탭
 */
export default function ExploreAlias() {
  const params = useLocalSearchParams<{ venuePick?: string }>();
  const venuePick = params.venuePick === '1' || params.venuePick === 'true';
  if (venuePick) {
    return <Redirect href={{ pathname: '/(tabs)/screen', params: { venuePick: '1' } }} />;
  }
  return <Redirect href="/(tabs)/joins" />;
}
