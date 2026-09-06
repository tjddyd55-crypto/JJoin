import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../primitives/Text';
import { JoinCapacityRow } from '../JoinCapacityRow';
import { JoinDdayBadge } from '../JoinDdayBadge';
import { JoinHostAvatar } from '../JoinHostAvatar';
import { JoinScheduleRow } from '../JoinScheduleRow';
import { JoinStatusBadge, type JoinStatusBadgeTone } from '../JoinStatusBadge';
import { JoinVenueRow } from '../JoinVenueRow';
import { RecommendationReasonTag } from '../RecommendationReasonTag';
import { useTheme } from '../../theme';
import { shadows } from '../../tokens';

export type JoinCardVariant = 'compact' | 'default' | 'preview' | 'management';

export type JoinCardStatusBadge = {
  label: string;
  tone?: JoinStatusBadgeTone;
};

export type JoinCardProps = {
  variant?: JoinCardVariant;
  title: string;
  venueName: string;
  venueSubLabel?: string | null;
  scheduleLabel: string;
  countLabel: string;
  seatsHighlight?: string | null;
  seatsHighlightTone?: 'available' | 'lastSeat' | 'full';
  ddayLabel?: string | null;
  statusBadges?: JoinCardStatusBadge[];
  hostNickname?: string | null;
  hostAvatarUrl?: string | null;
  reasonTags?: string[];
  rewardLabel?: string | null;
  isUrgent?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function JoinCard({
  variant = 'default',
  title,
  venueName,
  venueSubLabel,
  scheduleLabel,
  countLabel,
  seatsHighlight,
  seatsHighlightTone = 'available',
  ddayLabel,
  statusBadges,
  hostNickname,
  hostAvatarUrl,
  reasonTags,
  rewardLabel,
  isUrgent,
  onPress,
  accessibilityLabel,
}: JoinCardProps) {
  const theme = useTheme();
  const isCompact = variant === 'compact' || variant === 'preview';
  const titleLines = 1;

  const badges: JoinCardStatusBadge[] = [...(statusBadges ?? [])];
  if (isUrgent && !badges.some((b) => b.label.includes('긴급'))) {
    badges.unshift({ label: '긴급 모집', tone: 'urgent' });
  }

  const a11yLabel =
    accessibilityLabel ??
    [ddayLabel, title, venueName, scheduleLabel, countLabel, seatsHighlight]
      .filter(Boolean)
      .join(' · ');

  const inner = (
    <View
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
        <JoinHostAvatar
          profileImageUrl={hostAvatarUrl}
          hostName={hostNickname}
          size="md"
          showHostBadge
        />
        <View style={styles.body}>
          <View style={styles.badgeRow}>
            {ddayLabel ? <JoinDdayBadge label={ddayLabel} /> : null}
            {badges.map((badge) => (
              <JoinStatusBadge key={badge.label} label={badge.label} tone={badge.tone} />
            ))}
          </View>
          <Text
            variant="joinCardTitle"
            tone="primary"
            numberOfLines={titleLines}
          >
            {title}
          </Text>
          <JoinVenueRow venueName={venueName} subLabel={venueSubLabel} emphasis="list" />
          <JoinScheduleRow label={scheduleLabel} />
          <JoinCapacityRow
            countLabel={countLabel}
            seatsHighlight={seatsHighlight}
            highlightTone={seatsHighlightTone}
          />
          {reasonTags && reasonTags.length > 0 ? (
            <View style={styles.tags}>
              {reasonTags.slice(0, 2).map((tag) => (
                <RecommendationReasonTag key={tag} label={tag} />
              ))}
            </View>
          ) : null}
          {rewardLabel && variant !== 'preview' ? (
            <Text variant="meta" tone="success" numberOfLines={1}>
              {rewardLabel}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );

  if (!onPress) return inner;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardCompact: {
    paddingVertical: 12,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  body: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
