import { StyleSheet, View } from 'react-native';
import { JoinHostAvatar } from '../JoinHostAvatar';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

export type ClubMemberAvatarStackMember = {
  id: string;
  nickname: string;
  avatarUrl?: string | null;
};

export type ClubMemberAvatarStackProps = {
  members: ClubMemberAvatarStackMember[];
  totalCount?: number;
  maxVisible?: number;
};

export function ClubMemberAvatarStack({
  members,
  totalCount,
  maxVisible = 4,
}: ClubMemberAvatarStackProps) {
  const theme = useTheme();
  const visible = members.slice(0, maxVisible);
  const overflow = (totalCount ?? members.length) - visible.length;

  return (
    <View style={styles.row}>
      {visible.map((member, index) => (
        <View
          key={member.id}
          style={[
            styles.avatarWrap,
            index > 0 && styles.overlap,
            { borderColor: theme.colors.surface.card },
          ]}
        >
          <JoinHostAvatar
            profileImageUrl={member.avatarUrl}
            hostName={member.nickname}
            size="sm"
          />
        </View>
      ))}
      {overflow > 0 ? (
        <View
          style={[
            styles.overflow,
            {
              backgroundColor: theme.colors.surface.soft,
              borderColor: theme.colors.border.subtle,
            },
          ]}
        >
          <Text variant="clubStatus" tone="secondary">
            +{overflow}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    borderWidth: 2,
    borderRadius: 999,
  },
  overlap: {
    marginLeft: -10,
  },
  overflow: {
    marginLeft: -6,
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
});
