import { StyleSheet, View, type ViewProps } from 'react-native';
import type { ReactNode } from 'react';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

export type JoinDetailSectionProps = ViewProps & {
  /** Omit for card-only blocks without a large section heading. */
  title?: string;
  children: ReactNode;
};

export function JoinDetailSection({ title, children, style, ...rest }: JoinDetailSectionProps) {
  const theme = useTheme();

  return (
    <View style={[styles.section, style]} {...rest}>
      {title ? (
        <Text variant="joinSectionTitle" tone="primary">
          {title}
        </Text>
      ) : null}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface.card,
            borderColor: theme.colors.border.subtle,
            borderRadius: theme.radius.lg,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  card: {
    padding: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
