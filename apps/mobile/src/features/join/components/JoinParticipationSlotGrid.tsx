import { StyleSheet, View } from 'react-native';
import { JoinHostAvatar, Text, useTheme } from '@jjoin/design-system';
import type { JoinRosterSlot } from '../../../ui/join-detail-display';
import { MemberActionMenu } from '../../member/components/MemberActionMenu';
import { useSession } from '../../../session/SessionContext';

export type JoinParticipationSlotGridProps = {
  slots: JoinRosterSlot[];
};

function FilledSlot({
  userId,
  nickname,
  isHost,
  avatarUrl,
}: {
  userId?: string;
  nickname: string;
  isHost: boolean;
  avatarUrl: string | null;
}) {
  const theme = useTheme();
  const { me } = useSession();

  return (
    <View
      style={[
        styles.slot,
        {
          backgroundColor: theme.colors.surface.card,
          borderColor: theme.colors.border.subtle,
        },
      ]}
    >
      <JoinHostAvatar profileImageUrl={avatarUrl} hostName={nickname} size="sm" />
      <Text variant="bodyStrong" tone="primary" numberOfLines={1} style={styles.nickname}>
        {isHost ? '👑 ' : ''}
        {nickname}
      </Text>
      {userId ? (
        <MemberActionMenu
          targetUserId={userId}
          nickname={nickname}
          viewerUserId={me?.userId}
          coinGiftEnabled={me?.featureFlags?.coinGiftEnabled !== false}
          messagingEnabled={me?.messagePolicy?.enabled !== false}
        />
      ) : null}
    </View>
  );
}

function EmptySlot({ gender }: { gender?: 'MALE' | 'FEMALE' | null }) {
  const theme = useTheme();
  const label =
    gender === 'MALE' ? '남성 자리' : gender === 'FEMALE' ? '여성 자리' : '빈 자리';

  return (
    <View
      style={[
        styles.slot,
        styles.emptySlot,
        {
          backgroundColor: theme.colors.surface.soft,
          borderColor: theme.colors.border.subtle,
        },
      ]}
    >
      <Text variant="caption" tone="tertiary">{label}</Text>
    </View>
  );
}

export function JoinParticipationSlotGrid({ slots }: JoinParticipationSlotGridProps) {
  if (slots.length === 0) return null;

  return (
    <View style={styles.grid}>
      {slots.map((slot, index) => (
        <View
          key={slot.type === 'filled' ? slot.participantId : `empty-${index}`}
          style={styles.cell}
        >
          {slot.type === 'filled' ? (
            <FilledSlot
              userId={slot.userId}
              nickname={slot.nickname}
              isHost={slot.isHost}
              avatarUrl={slot.avatarUrl}
            />
          ) : (
            <EmptySlot gender={slot.type === 'empty' ? slot.gender : undefined} />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cell: {
    width: '48%',
    flexGrow: 1,
    minWidth: 0,
  },
  slot: {
    minHeight: 72,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptySlot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  nickname: {
    flex: 1,
    minWidth: 0,
  },
});
