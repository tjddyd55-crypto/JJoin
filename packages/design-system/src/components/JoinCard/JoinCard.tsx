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
import { colors, shadows } from '../../tokens';

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
  /** Join character chips (skill / game / after). */
  infoTags?: string[];
  rewardLabel?: string | null;
  /** FIELD expected KRW — never a Coin amount. */
  costLabel?: string | null;
  isUrgent?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Finished join: dimmed card with a "완료" watermark. Stays pressable (read-only detail). */
  completed?: boolean;
  /** Watermark text for completed cards (default "조인 완료"). */
  completedLabel?: string;
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
  infoTags,
  rewardLabel,
  costLabel,
  isUrgent,
  onPress,
  accessibilityLabel,
  completed = false,
  completedLabel = '조인 완료',
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
    [completed ? completedLabel : null, ddayLabel, title, venueName, scheduleLabel, countLabel, seatsHighlight]
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
          {(infoTags && infoTags.length > 0) || (reasonTags && reasonTags.length > 0) ? (
            <View style={styles.tags}>
              {(infoTags ?? []).slice(0, 3).map((tag) => (
                <RecommendationReasonTag key={tag} label={tag} />
              ))}
              {(reasonTags ?? []).slice(0, 2).map((tag) => (
                <RecommendationReasonTag key={tag} label={tag} />
              ))}
            </View>
          ) : null}
          {costLabel && variant !== 'preview' ? (
            <Text variant="meta" tone="primary" numberOfLines={1}>
              {costLabel}
            </Text>
          ) : null}
          {rewardLabel && variant !== 'preview' ? (
            <Text variant="meta" tone="success" numberOfLines={1}>
              {rewardLabel}
            </Text>
          ) : null}
        </View>
      </View>
      {completed ? (
        <View
          pointerEvents="none"
          testID="join-card-completed-overlay"
          style={[
            StyleSheet.absoluteFill,
            styles.completedOverlay,
            { backgroundColor: colors.overlay, borderRadius: theme.radius.joinCard },
          ]}
        >
          <View style={[styles.completedStamp, { borderColor: colors.white }]}>
            <Text variant="joinCardTitle" style={[styles.completedStampText, { color: colors.white }]}>
              {completedLabel}
            </Text>
          </View>
        </View>
      ) : null}
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
  completedOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  completedStamp: {
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 4,
    transform: [{ rotate: '-12deg' }],
  },
  completedStampText: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: 6,
  },
});
