import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Button, Input, ScrollScreenFrame, Spacer, Text } from '@jjoin/design-system';
import { DIRECT_MESSAGE_POLL_INTERVAL_MS } from '@jjoin/domain';
import type { DirectConversationDto, DirectMessageDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore, useSession } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';
import {
  mergeDirectMessages,
  resolveDirectMessageIdempotencyKey,
} from '../model/direct-message-thread';

function newMessageKey() {
  return `dm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function DirectConversationThreadScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { me } = useSession();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [conversation, setConversation] = useState<DirectConversationDto | null>(null);
  const [messages, setMessages] = useState<DirectMessageDto[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pendingSend = useRef<{ body: string; key: string } | null>(null);
  const coinCost = me?.messagePolicy?.coinCostPerMessage ?? 0;

  const load = useCallback(async () => {
    if (!conversationId) return;
    try {
      const [conv, page] = await Promise.all([
        api.getDirectConversation(conversationId),
        api.listDirectMessages(conversationId),
      ]);
      setConversation(conv);
      setMessages((prev) => mergeDirectMessages(prev, page.items));
      await api.markDirectConversationRead(conversationId);
      setError(null);
    } catch (e) {
      const text = e instanceof Error ? e.message : '';
      if (text.includes('messaging_disabled')) setError('회원 메시지가 비활성화되어 있습니다.');
      else if (text.includes('premium_required')) setError('프리미엄 회원만 메시지를 보낼 수 있습니다.');
      else if (text.includes('friends_only')) setError('골프친구에게만 메시지를 보낼 수 있습니다.');
      else setError('대화를 불러오지 못했습니다.');
    }
  }, [api, conversationId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!conversationId) return;
    const timer = setInterval(() => {
      if (AppState.currentState !== 'active') return;
      void load();
    }, DIRECT_MESSAGE_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [conversationId, load]);

  async function onSend() {
    if (!conversationId || busy) return;
    const body = draft.trim();
    if (!body) return;
    const pending = resolveDirectMessageIdempotencyKey({
      body,
      previousBody: pendingSend.current?.body ?? null,
      previousKey: pendingSend.current?.key ?? null,
      mint: newMessageKey,
    });
    pendingSend.current = pending;
    setBusy(true);
    setError(null);
    try {
      const sent = await api.postDirectMessage(conversationId, {
        body: pending.body,
        idempotencyKey: pending.key,
      });
      setMessages((prev) => mergeDirectMessages(prev, [sent]));
      setDraft('');
      pendingSend.current = null;
      await api.markDirectConversationRead(conversationId);
    } catch (e) {
      const text = e instanceof Error ? e.message : '';
      if (text.includes('insufficient')) setError('사용 가능 코인이 부족합니다.');
      else if (text.includes('premium_required')) setError('프리미엄 회원만 메시지를 보낼 수 있습니다.');
      else if (text.includes('friends_only')) setError('골프친구에게만 메시지를 보낼 수 있습니다.');
      else if (text.includes('messaging_disabled')) setError('회원 메시지가 비활성화되어 있습니다.');
      else setError('메시지를 보내지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
        <Text variant="bodyStrong">{conversation?.peer.nickname ?? '대화'}</Text>
        {coinCost > 0 ? (
          <Text variant="caption" tone="secondary">
            메시지 1건당 {coinCost} C가 차감됩니다. 잔액 {me?.walletSummary?.availableCoin ?? '0'} C
          </Text>
        ) : (
          <Text variant="caption" tone="secondary">
            텍스트만 보낼 수 있습니다. 사진/파일/음성은 지원하지 않습니다.
          </Text>
        )}
        <Spacer size="md" />
        {messages.map((item) => (
          <View key={item.id} style={[styles.bubble, item.mine ? styles.mine : styles.theirs]}>
            <Text variant="body">{item.body}</Text>
            <Text variant="caption" tone="tertiary">
              {new Date(item.createdAt).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Seoul',
              })}
            </Text>
          </View>
        ))}
        {error ? (
          <>
            <Spacer size="sm" />
            <Text tone="error">{error}</Text>
          </>
        ) : null}
        <Spacer size="md" />
        <Input label="메시지" value={draft} onChangeText={setDraft} />
        <Spacer size="sm" />
        <Button label="보내기" loading={busy} onPress={() => void onSend()} />
      </ScrollScreenFrame>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bubble: {
    maxWidth: '84%',
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  mine: { alignSelf: 'flex-end', backgroundColor: 'rgba(255,196,0,0.18)' },
  theirs: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.06)' },
});
