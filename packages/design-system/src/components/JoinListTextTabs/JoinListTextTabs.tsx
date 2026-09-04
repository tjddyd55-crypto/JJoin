import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

export type JoinListTextTab = {
  id: string;
  label: string;
};

export type JoinListTextTabsProps = {
  tabs: JoinListTextTab[];
  activeId: string;
  onChange: (id: string) => void;
};

export function JoinListTextTabs({ tabs, activeId, onChange }: JoinListTextTabsProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {tabs.map((tab) => {
        const selected = tab.id === activeId;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            style={styles.tab}
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
                  { backgroundColor: theme.colors.text.primary },
                ]}
              />
            ) : (
              <View style={styles.indicatorPlaceholder} />
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
  tab: {
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    justifyContent: 'flex-end',
  },
  indicator: {
    width: 42,
    height: 3,
    borderRadius: 2,
  },
  indicatorPlaceholder: {
    height: 3,
  },
});
