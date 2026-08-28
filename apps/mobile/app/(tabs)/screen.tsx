import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@jjoin/design-system';
import { ExploreMapScreen } from '../../src/features/explore/screens/ExploreMapScreen';

/**
 * 스크린 탭 — 스크린골프장 지도 탐색 · 장소 선택 · 조인 생성 연결.
 */
export default function ScreenTab() {
  const theme = useTheme();
  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.surface.base }]}
      edges={['top']}
    >
      <ExploreMapScreen discoveryLinked={false} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
