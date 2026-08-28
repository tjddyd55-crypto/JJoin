import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, spacing, useTheme } from '@jjoin/design-system';
import { ExploreMapScreen } from '../screens/ExploreMapScreen';
import { RegionJoinExploreScreen } from '../region-explore/RegionJoinExploreScreen';

type ScreenExploreTab = 'REGION' | 'MAP';

/**
 * 스크린 탭 — [지역별 | 지도] 실험 UI.
 * 지도 탭은 기존 ExploreMapScreen을 그대로 사용 (discoveryLinked=false).
 */
export function ScreenExploreScreen() {
  const theme = useTheme();
  const gold = theme.colors.action.primary;
  const [tab, setTab] = useState<ScreenExploreTab>('REGION');

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.surface.base }]}>
      <View style={styles.tabRow}>
        {(
          [
            { id: 'REGION' as const, label: '지역별' },
            { id: 'MAP' as const, label: '지도' },
          ] as const
        ).map((item) => {
          const selected = tab === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setTab(item.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={item.label}
              style={[
                styles.tabChip,
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

      <View style={styles.content}>
        {tab === 'REGION' ? (
          <RegionJoinExploreScreen onSwitchToMap={() => setTab('MAP')} />
        ) : (
          <ExploreMapScreen discoveryLinked={false} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  tabChip: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: spacing.sm,
  },
  content: {
    flex: 1,
  },
});
