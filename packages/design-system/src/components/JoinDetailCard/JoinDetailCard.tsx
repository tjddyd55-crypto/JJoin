import { StyleSheet, View, type ViewProps } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '../../theme';

/** Card shell for join detail — no outer section heading. */
export type JoinDetailCardProps = ViewProps & {
  children: ReactNode;
};

export function JoinDetailCard({ children, style, ...rest }: JoinDetailCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface.card,
          borderColor: theme.colors.border.subtle,
          borderRadius: theme.radius.lg,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
