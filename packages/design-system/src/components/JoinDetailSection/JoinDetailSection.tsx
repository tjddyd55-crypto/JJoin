import { StyleSheet, View, type ViewProps } from 'react-native';
import type { ReactNode } from 'react';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';
import { shadows } from '../../tokens';

export type JoinDetailSectionProps = ViewProps & {
  title: string;
  children: ReactNode;
};

export function JoinDetailSection({ title, children, style, ...rest }: JoinDetailSectionProps) {
  const theme = useTheme();

  return (
    <View style={[styles.section, style]} {...rest}>
      <Text variant="sectionTitle" tone="primary" style={styles.title}>
        {title}
      </Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface.card,
            borderColor: theme.colors.border.subtle,
            borderRadius: theme.radius.lg,
          },
          shadows.card,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  card: {
    padding: 16,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
