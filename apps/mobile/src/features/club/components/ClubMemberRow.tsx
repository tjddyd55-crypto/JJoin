import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card, ClubStatusBadge, JoinHostAvatar, Text } from '@jjoin/design-system';
import { ClubMembershipRole } from '@jjoin/types';

type Props = {
  nickname: string;
  role: ClubMembershipRole;
  meta: string;
  onPress?: () => void;
  actions?: ReactNode;
};

function roleBadge(
  role: ClubMembershipRole,
): { label: string; tone: 'active' | 'recruiting' | 'neutral' } {
  switch (role) {
    case ClubMembershipRole.OWNER:
      return { label: '방장', tone: 'active' };
    case ClubMembershipRole.MANAGER:
      return { label: '운영진', tone: 'recruiting' };
    default:
      return { label: '회원', tone: 'neutral' };
  }
}

export function ClubMemberRow({ nickname, role, meta, onPress, actions }: Props) {
  const badge = roleBadge(role);
  const content = (
    <Card padding="md" variant={onPress ? 'interactive' : 'base'}>
      <View style={styles.row}>
        <JoinHostAvatar profileImageUrl={null} hostName={nickname} size="sm" />
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text variant="bodyStrong" style={styles.name}>{nickname}</Text>
            <ClubStatusBadge label={badge.label} tone={badge.tone} />
          </View>
          <Text variant="clubMeta" tone="tertiary">{meta}</Text>
          {actions ? <View style={styles.actions}>{actions}</View> : null}
        </View>
      </View>
    </Card>
  );

  if (!onPress) return content;
  return <Pressable onPress={onPress}>{content}</Pressable>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
});
