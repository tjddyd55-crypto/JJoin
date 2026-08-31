import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Button,
  Input,
  Text,
  useTheme,
} from '@jjoin/design-system';
import {
  CHAT_MESSAGE_MAX_LENGTH,
  CHAT_POLL_INTERVAL_MS,
  normalizeChatMessageBody,
} from '@jjoin/domain';
import {
  JoinChatMessageKind,
  JoinChatRoomStatus,
  type JoinChatMessageDto,
  type JoinChatRoomDto,
} from '@jjoin/types';
import { getApiClient } from '../../../src/lib/api';
import { getSecureSessionStore, useSession } from '../../../src/session/SessionContext';

const PAGE_LIMIT = 50;

function mergeMessages(
  existing: JoinChatMessageDto[],
  incoming: JoinChatMessageDto[],
): JoinChatMessageDto[] {
  const byId = new Map<string, JoinChatMessageDto>();
  for (const m of [...existing, ...incoming]) {
    byId.set(m.messageId, m);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export default function JoinChatScreen() {
  const { joinId } = useLocalSearchParams<{ joinId: string }>();
  const { me } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const myUserId = me?.userId;

  const [room, setRoom] = useState<JoinChatRoomDto | null>(null);
  const [messages, setMessages] = useState<JoinChatMessageDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [focused, setFocused] = useState(true);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const loadingOlderRef = useRef(false);

  const loadLatest = useCallback(async () => {
    if (!joinId) return;
    try {
      const [nextRoom, page] = await Promise.all([
        api.getJoinChat(joinId),
        api.getJoinChatMessages(joinId, { limit: PAGE_LIMIT }),
      ]);
      setRoom(nextRoom);
      setMessages((prev) => mergeMessages(prev, page.items));
      setNextCursor(page.nextCursor);
      setAccessDenied(false);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('403') || msg.includes('Forbidden') || msg.includes('chat_access')) {
        setAccessDenied(true);
        setError('채팅에 참여할 수 없습니다.');
      } else {
        setError('채팅을 불러오지 못했습니다.');
      }
    }
  }, [api, joinId]);

  const loadOlder = useCallback(async () => {
    if (!joinId || !nextCursor || loadingOlderRef.current) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const page = await api.getJoinChatMessages(joinId, {
        before: nextCursor,
        limit: PAGE_LIMIT,
      });
      setMessages((prev) => mergeMessages(prev, page.items));
      setNextCursor(page.nextCursor);
    } catch {
      setError('이전 메시지를 불러오지 못했습니다.');
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [api, joinId, nextCursor]);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      void loadLatest();
      return () => setFocused(false);
    }, [loadLatest]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
      if (state === 'active') void loadLatest();
    });
    return () => sub.remove();
  }, [loadLatest]);

  useEffect(() => {
    if (!focused || !appActive || accessDenied) return;
    const timer = setInterval(() => {
      void loadLatest();
    }, CHAT_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [focused, appActive, accessDenied, loadLatest]);

  async function onSend() {
    if (!joinId || busy || !room?.canPost) return;
    let body: string;
    try {
      body = normalizeChatMessageBody(draft);
    } catch {
      setError('메시지를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await api.postJoinChatMessage(joinId, { body });
      setMessages((prev) => mergeMessages(prev, [created]));
      setDraft('');
    } catch {
      setError('메시지 전송에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  if (accessDenied) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.app.background }]}>
        <Text variant="body" tone="error">
          {error ?? '채팅에 참여할 수 없습니다.'}
        </Text>
        <Button label="뒤로" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const readOnly =
    !room?.canPost ||
    room.status === JoinChatRoomStatus.READ_ONLY ||
    room.status === JoinChatRoomStatus.CLOSED;
  const statusHint =
    room?.status === JoinChatRoomStatus.CLOSED
      ? '채팅이 종료되었습니다.'
      : room?.status === JoinChatRoomStatus.READ_ONLY
        ? '읽기 전용입니다. 새 메시지는 보낼 수 없습니다.'
        : null;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.colors.app.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      {statusHint ? (
        <View style={styles.statusBar}>
          <Text variant="caption" tone="tertiary">
            {statusHint}
          </Text>
        </View>
      ) : null}
      {error && !accessDenied ? (
        <View style={styles.statusBar}>
          <Text variant="caption" tone="error">
            {error}
          </Text>
        </View>
      ) : null}

      <FlatList
        data={messages}
        inverted
        keyExtractor={(item) => item.messageId}
        contentContainerStyle={styles.listContent}
        onEndReached={() => void loadOlder()}
        onEndReachedThreshold={0.2}
        ListFooterComponent={
          loadingOlder ? (
            <ActivityIndicator color={theme.colors.action.primary} style={styles.loader} />
          ) : null
        }
        ListEmptyComponent={
          <Text variant="body" tone="tertiary" style={styles.empty}>
            아직 메시지가 없습니다.
          </Text>
        }
        renderItem={({ item }) => {
          if (item.kind === JoinChatMessageKind.SYSTEM) {
            return (
              <View style={styles.systemWrap}>
                <Text variant="caption" tone="tertiary" style={styles.systemText}>
                  {item.body}
                </Text>
              </View>
            );
          }
          const mine = Boolean(myUserId && item.senderUserId === myUserId);
          return (
            <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
              <View
                style={[
                  styles.bubble,
                  mine
                    ? {
                        backgroundColor: theme.colors.surface.card,
                        borderColor: theme.colors.action.primary,
                      }
                    : {
                        backgroundColor: theme.colors.surface.elevated,
                        borderColor: theme.colors.border.subtle,
                      },
                ]}
              >
                {!mine && item.senderNickname ? (
                  <Text variant="caption" tone="secondary">
                    {item.senderNickname}
                  </Text>
                ) : null}
                <Text variant="body" tone="primary">
                  {item.body}
                </Text>
                <Text variant="caption" tone="tertiary">
                  {new Date(item.createdAt).toLocaleTimeString('ko-KR', {
                    timeZone: 'Asia/Seoul',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <View
        style={[
          styles.composer,
          {
            borderTopColor: theme.colors.border.subtle,
            backgroundColor: theme.colors.app.background,
          },
        ]}
      >
        <View style={styles.inputWrap}>
          <Input
            value={draft}
            onChangeText={setDraft}
            placeholder={readOnly ? '메시지를 보낼 수 없습니다' : '메시지 입력'}
            editable={!readOnly}
            maxLength={CHAT_MESSAGE_MAX_LENGTH}
          />
        </View>
        <Button
          label="전송"
          fullWidth={false}
          loading={busy}
          disabled={readOnly || !draft.trim()}
          onPress={() => void onSend()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 24,
  },
  statusBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
  },
  loader: { marginVertical: 12 },
  empty: {
    textAlign: 'center',
    transform: [{ scaleY: -1 }],
    marginTop: 24,
  },
  systemWrap: {
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 24,
  },
  systemText: {
    textAlign: 'center',
  },
  bubbleRow: {
    marginVertical: 4,
    maxWidth: '82%',
  },
  bubbleRowMine: {
    alignSelf: 'flex-end',
  },
  bubbleRowOther: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flex: 1,
  },
});
