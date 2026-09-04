import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme';
import { shadows } from '../../tokens';

type Props = {
  variant?: 'compact' | 'default';
};

function Bone({ width, height, radius = 8 }: { width: number | `${number}%`; height: number; radius?: number }) {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: theme.colors.surface.soft,
      }}
    />
  );
}

export function JoinCardSkeleton({ variant = 'compact' }: Props) {
  const theme = useTheme();
  const isCompact = variant === 'compact';

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="추천 조인 불러오는 중"
      style={[
        styles.card,
        isCompact ? styles.cardCompact : null,
        {
          backgroundColor: theme.colors.surface.card,
          borderColor: theme.colors.border.subtle,
          borderRadius: theme.radius.joinCard,
        },
        shadows.card,
      ]}
    >
      <View style={styles.mainRow}>
        <Bone width={56} height={56} radius={28} />
        <View style={styles.body}>
          <View style={styles.badgeRow}>
            <Bone width={52} height={28} radius={999} />
            <Bone width={64} height={28} radius={999} />
          </View>
          <Bone width="88%" height={isCompact ? 20 : 24} radius={6} />
          <Bone width="72%" height={18} radius={6} />
          <Bone width="56%" height={18} radius={6} />
          {!isCompact ? <Bone width="40%" height={18} radius={6} /> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    minHeight: 132,
  },
  cardCompact: {
    minHeight: 118,
  },
  mainRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  body: {
    flex: 1,
    gap: 7,
    minWidth: 0,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
