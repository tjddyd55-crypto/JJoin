import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from '@jjoin/design-system';

type StarRatingInputProps = {
  value: number;
  onChange: (next: number) => void;
  size?: number;
  disabled?: boolean;
};

/** Tap 1–5 stars. Gold when selected; muted when not. */
export function StarRatingInput({
  value,
  onChange,
  size = 32,
  disabled,
}: StarRatingInputProps) {
  const theme = useTheme();
  return (
    <View style={styles.row} accessibilityRole="adjustable" accessibilityValue={{ min: 1, max: 5, now: value }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const selected = n <= value;
        return (
          <Pressable
            key={n}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`${n}점`}
            hitSlop={8}
            onPress={() => onChange(n)}
            style={({ pressed }) => [
              styles.starHit,
              { width: size + 12, height: size + 12, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text
              variant="bodyStrong"
              style={{
                fontSize: size,
                lineHeight: size + 4,
                color: selected ? theme.colors.action.primary : theme.colors.text.tertiary,
              }}
            >
              {selected ? '★' : '☆'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type StarRatingDisplayProps = {
  rating: number;
  size?: number;
};

export function StarRatingDisplay({ rating, size = 14 }: StarRatingDisplayProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <Text variant="caption" style={{ color: theme.colors.action.primary, fontSize: size }}>
      {'★'.repeat(clamped)}
      {'☆'.repeat(5 - clamped)}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  starHit: { alignItems: 'center', justifyContent: 'center' },
});
