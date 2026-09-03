import { StyleSheet, View } from 'react-native';
import { Button, type ButtonProps } from '../Button';
import { useTheme } from '../../theme';
import { spacing } from '../../tokens';

export type JoinStickyActionBarProps = {
  primaryAction?: ButtonProps | null;
  secondaryActions?: ButtonProps[];
};

export function JoinStickyActionBar({ primaryAction, secondaryActions }: JoinStickyActionBarProps) {
  const theme = useTheme();
  if (!primaryAction && !(secondaryActions && secondaryActions.length > 0)) return null;

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.surface.card,
          borderTopColor: theme.colors.border.subtle,
        },
      ]}
    >
      {secondaryActions?.map((action) => (
        <Button key={action.label} {...action} />
      ))}
      {primaryAction ? <Button {...primaryAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
