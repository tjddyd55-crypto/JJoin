import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '../../icons/Icon';
import { Text } from '../../primitives/Text';
import { Badge } from '../Badge';
import { JoinHostAvatar } from '../JoinHostAvatar';
import { RecommendationReasonTag } from '../RecommendationReasonTag';
import { useTheme } from '../../theme';
import { shadows } from '../../tokens';

export type JoinCardProps = {
  title: string;
  timeLabel: string;
  regionLabel?: string | null;
  distanceLabel?: string | null;
  participantLabel: string;
  seatsLeft?: number;
  hostNickname?: string | null;
  hostAvatarUrl?: string | null;
  reasonTags?: string[];
  rewardLabel?: string | null;
  isUrgent?: boolean;
  statusBadge?: string | null;
  onPress?: () => void;
};

export function JoinCard({
  title,
  timeLabel,
  regionLabel,
  distanceLabel,
  participantLabel,
  seatsLeft,
  hostNickname,
  hostAvatarUrl,
  reasonTags,
  rewardLabel,
  isUrgent,
  statusBadge,
  onPress,
}: JoinCardProps) {
  const theme = useTheme();
  const locationBits = [regionLabel, distanceLabel].filter(Boolean).join(' · ');

  const inner = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface.card,
          borderColor: theme.colors.border.subtle,
          borderRadius: theme.radius.lg,
          minHeight: theme.sizes.touchTarget + 48,
        },
        shadows.card,
      ]}
    >
      <JoinHostAvatar
        profileImageUrl={hostAvatarUrl}
        hostName={hostNickname}
        size="md"
        showHostBadge
      />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant="cardTitle" tone="primary" numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          {isUrgent ? <Badge label="긴급" variant="warning" /> : null}
          {statusBadge ? <Badge label={statusBadge} variant="neutral" /> : null}
        </View>

        <View style={styles.metaRow}>
          <Icon name="calendar" size="sm" tone="tertiary" />
          <Text variant="meta" tone="primary" numberOfLines={1}>
            {timeLabel}
          </Text>
        </View>

        {locationBits ? (
          <View style={styles.metaRow}>
            <Icon name="location" size="sm" tone="tertiary" />
            <Text variant="meta" tone="secondary" numberOfLines={1}>
              {locationBits}
            </Text>
          </View>
        ) : null}

        <View style={styles.metaRow}>
          <Icon name="people" size="sm" tone="tertiary" />
          <Text variant="meta" tone="secondary" numberOfLines={1}>
            {participantLabel}
            {seatsLeft != null && seatsLeft > 0 ? ` · ${seatsLeft}자리 남음` : ''}
          </Text>
        </View>

        {hostNickname ? (
          <Text variant="meta" tone="tertiary" numberOfLines={1}>
            방장 {hostNickname}
          </Text>
        ) : null}

        {reasonTags && reasonTags.length > 0 ? (
          <View style={styles.tags}>
            {reasonTags.slice(0, 2).map((tag) => (
              <RecommendationReasonTag key={tag} label={tag} />
            ))}
          </View>
        ) : null}

        {rewardLabel ? (
          <Text variant="meta" tone="success" numberOfLines={1}>
            {rewardLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (!onPress) return inner;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  title: {
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
});
