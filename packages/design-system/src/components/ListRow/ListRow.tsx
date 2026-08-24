import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from '../../primitives/Text';
import { Row } from '../../primitives/Row';
import { Icon } from '../../icons/Icon';
import type { IconName } from '../../icons/iconTypes';
import { useTheme } from '../../theme';
import { sizes } from '../../tokens';

export type ListRowTrailing = 'chevron' | 'none';

export type ListRowProps = {
  label: string;
  subtitle?: string;
  icon?: IconName;
  trailing?: ListRowTrailing;
  onPress?: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
  showSeparator?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

export function ListRow({
  label,
  subtitle,
  icon,
  trailing = 'chevron',
  onPress,
  disabled = false,
  tone = 'default',
  showSeparator = true,
  accessibilityLabel,
  style,
}: ListRowProps) {
  const theme = useTheme();
  const labelTone = tone === 'danger' ? 'error' : 'primary';
  const interactive = Boolean(onPress) && !disabled;

  const content = (
    <Row
      align="center"
      gap="md"
      style={[
        styles.row,
        {
          minHeight: sizes.input.lg,
          borderBottomColor: showSeparator ? theme.colors.border.subtle : 'transparent',
          borderBottomWidth: showSeparator ? StyleSheet.hairlineWidth : 0,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} tone={tone === 'danger' ? 'error' : 'secondary'} size="md" /> : null}
      <View style={styles.labelBlock}>
        <Text variant="body" tone={labelTone}>
          {label}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="tertiary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing === 'chevron' ? (
        <Icon name="chevronRight" tone="tertiary" size="sm" />
      ) : (
        <View style={styles.trailingSpacer} />
      )}
    </Row>
  );

  if (!interactive) {
    return (
      <View accessibilityRole="text" accessibilityLabel={accessibilityLabel ?? label}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 10,
  },
  labelBlock: {
    flex: 1,
    gap: 2,
  },
  trailingSpacer: {
    width: 16,
  },
});
