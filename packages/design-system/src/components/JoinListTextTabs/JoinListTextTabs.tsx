import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

export type JoinListTextTab = {
  id: string;
  label: string;
};

export type JoinListTextTabsDensity = 'default' | 'compact';

export type JoinListTextTabsProps = {
  tabs: JoinListTextTab[];
  activeId: string;
  onChange: (id: string) => void;
  density?: JoinListTextTabsDensity;
};

export function JoinListTextTabs({
  tabs,
  activeId,
  onChange,
  density = 'default',
}: JoinListTextTabsProps) {
  const theme = useTheme();
  const compact = density === 'compact';

  return (
    <View style={[styles.row, compact ? styles.rowCompact : null]}>
      {tabs.map((tab) => {
        const selected = tab.id === activeId;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            style={[styles.tab, compact ? styles.tabCompact : null]}
          >
            <Text
              variant="joinTabLabel"
              tone={selected ? 'primary' : 'secondary'}
            >
              {tab.label}
            </Text>
            {selected ? (
              <View
                style={[
                  styles.indicator,
                  compact ? styles.indicatorCompact : null,
                  { backgroundColor: theme.colors.text.primary },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.indicatorPlaceholder,
                  compact ? styles.indicatorPlaceholderCompact : null,
                ]}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 28,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  rowCompact: {
    gap: 16,
    paddingTop: 0,
    paddingBottom: 4,
  },
  tab: {
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    justifyContent: 'flex-end',
  },
  tabCompact: {
    gap: 3,
    minHeight: 32,
  },
  indicator: {
    width: 42,
    height: 3,
    borderRadius: 2,
  },
  indicatorCompact: {
    width: 28,
    height: 2,
  },
  indicatorPlaceholder: {
    height: 3,
  },
  indicatorPlaceholderCompact: {
    height: 2,
  },
});
