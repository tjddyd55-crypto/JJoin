import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Button, Text, useTheme } from '@jjoin/design-system';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { isOwnMemberProfile } from '../model/member-actions';

export { isOwnMemberProfile };

export type MemberActionMenuProps = {
  targetUserId: string;
  nickname: string;
  viewerUserId?: string | null;
  variant?: 'compact' | 'cta';
  coinGiftEnabled?: boolean;
  messagingEnabled?: boolean;
};

export function memberGiftHref(userId: string, nickname: string): Href {
  return {
    pathname: '/gift/[userId]',
    params: { userId, nickname },
  } as Href;
}

export async function openDirectConversation(peerUserId: string): Promise<string> {
  const api = getApiClient(getSecureSessionStore());
  const conversation = await api.createDirectConversation({ peerUserId });
  return conversation.id;
}

export function MemberActionMenu({
  targetUserId,
  nickname,
  viewerUserId,
  variant = 'compact',
  coinGiftEnabled = true,
  messagingEnabled = true,
}: MemberActionMenuProps) {
  const theme = useTheme();
  const router = useRouter();

  if (isOwnMemberProfile(viewerUserId, targetUserId)) return null;
  if (!messagingEnabled && !coinGiftEnabled) return null;

  async function onMessage() {
    try {
      const conversationId = await openDirectConversation(targetUserId);
      router.push(`/messages/${conversationId}` as Href);
    } catch (e) {
      const text = e instanceof Error ? e.message : '';
      if (text.includes('premium_required')) Alert.alert('메시지', '프리미엄 회원만 메시지를 보낼 수 있습니다.');
      else if (text.includes('friends_only')) Alert.alert('메시지', '골프친구에게만 메시지를 보낼 수 있습니다.');
      else if (text.includes('messaging_disabled')) Alert.alert('메시지', '회원 메시지가 비활성화되어 있습니다.');
      else if (text.includes('blocked')) Alert.alert('메시지', '차단된 회원에게는 보낼 수 없습니다.');
      else Alert.alert('메시지', '대화를 열 수 없습니다.');
    }
  }

  function onGift() {
    router.push(memberGiftHref(targetUserId, nickname));
  }

  if (variant === 'cta') {
    return (
      <View style={styles.ctaRow}>
        {messagingEnabled ? (
          <View style={styles.ctaItem}>
            <Button label="메시지 보내기" variant="secondary" onPress={() => void onMessage()} />
          </View>
        ) : null}
        {coinGiftEnabled ? (
          <View style={styles.ctaItem}>
            <Button label="코인 선물하기" onPress={onGift} />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.compactRow}>
      {messagingEnabled ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="메시지"
          onPress={(e) => {
            e.stopPropagation?.();
            void onMessage();
          }}
          style={[styles.chip, { borderColor: theme.colors.border.subtle }]}
        >
          <Text variant="caption" tone="primary">
            메시지
          </Text>
        </Pressable>
      ) : null}
      {coinGiftEnabled ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="코인 선물"
          onPress={(e) => {
            e.stopPropagation?.();
            onGift();
          }}
          style={[styles.chip, { borderColor: theme.colors.border.subtle }]}
        >
          <Text variant="caption" tone="primary">
            선물
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  compactRow: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  chip: {
    minHeight: 32,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  ctaRow: { flexDirection: 'row', gap: 8 },
  ctaItem: { flex: 1 },
});
