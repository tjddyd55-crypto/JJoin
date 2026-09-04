import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../primitives/Text';
import { ClubCover, type ClubCoverFallbackTone } from './ClubCover';
import { ClubStatusBadge, type ClubStatusBadgeTone } from './ClubStatusBadge';
import { useTheme } from '../../theme';
import { sizes } from '../../tokens';

export type ClubCardVariant = 'discovery' | 'compact' | 'myClub' | 'searchResult';

export type ClubCardProps = {
  variant?: ClubCardVariant;
  name: string;
  intro?: string | null;
  metaLine?: string | null;
  activityLine?: string | null;
  coverImageUrl?: string | null;
  statusLabel?: string | null;
  statusTone?: ClubStatusBadgeTone;
  showNewBadge?: boolean;
  fallbackTone?: ClubCoverFallbackTone;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function ClubCard({
  variant = 'discovery',
  name,
  intro,
  metaLine,
  activityLine,
  coverImageUrl,
  statusLabel,
  statusTone = 'active',
  showNewBadge = false,
  fallbackTone = 'green',
  onPress,
  accessibilityLabel,
}: ClubCardProps) {
  const theme = useTheme();
  const introLines = variant === 'compact' ? 1 : 2;
  const a11y =
    accessibilityLabel ??
    [name, intro, metaLine, activityLine, statusLabel].filter(Boolean).join(' · ');

  const content = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface.card,
          borderBottomColor: theme.colors.border.subtle,
        },
      ]}
    >
      <View style={styles.coverWrap}>
        <ClubCover
          uri={coverImageUrl}
          size={sizes.clubCover.list}
          fallbackTone={fallbackTone}
        />
        {showNewBadge ? (
          <View style={styles.newBadge}>
            <ClubStatusBadge label="NEW" tone="new" />
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text variant="clubCardTitle" tone="primary" numberOfLines={1}>
          {name}
        </Text>
        {intro ? (
          <Text variant="clubIntro" tone="secondary" numberOfLines={introLines}>
            {intro}
          </Text>
        ) : null}
        {metaLine ? (
          <Text variant="clubMeta" tone="tertiary" numberOfLines={1}>
            {metaLine}
          </Text>
        ) : null}
        {activityLine ? (
          <Text variant="clubStatus" tone="success" numberOfLines={1}>
            {activityLine}
          </Text>
        ) : null}
        {statusLabel ? (
          <ClubStatusBadge label={statusLabel} tone={statusTone} />
        ) : null}
      </View>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 108,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  coverWrap: {
    position: 'relative',
  },
  newBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
  },
  body: {
    flex: 1,
    gap: 4,
    minWidth: 0,
    paddingTop: 2,
  },
  pressed: {
    opacity: 0.92,
  },
});
