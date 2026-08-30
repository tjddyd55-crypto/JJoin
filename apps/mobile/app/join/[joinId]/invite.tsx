import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  ScrollScreenFrame,
  Spacer,
  Stack,
  Text,
  StickyActionFrame,
  useTheme,
} from '@jjoin/design-system';
import { JOIN_INVITE_MAX_BATCH } from '@jjoin/domain';
import type { PlayedTogetherPersonDto } from '@jjoin/types';
import { getApiClient } from '../../../src/lib/api';
import { getSecureSessionStore } from '../../../src/session/SessionContext';

export default function JoinInviteScreen() {
  const { joinId } = useLocalSearchParams<{ joinId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [people, setPeople] = useState<PlayedTogetherPersonDto[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentCount, setSentCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPeople(await api.listPlayedTogether());
    } catch {
      setError('함께 친 사람 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
        return next;
      }
      if (next.size >= JOIN_INVITE_MAX_BATCH) {
        setError(`한 번에 최대 ${JOIN_INVITE_MAX_BATCH}명까지 초대할 수 있습니다.`);
        return prev;
      }
      setError(null);
      next.add(userId);
      return next;
    });
  }

  async function onSend() {
    if (!joinId || busy || selected.size === 0) return;
    setBusy(true);
    setError(null);
    setSentCount(null);
    try {
      const created = await api.createJoinInvitations(joinId, {
        inviteeUserIds: Array.from(selected),
      });
      setSentCount(created.length);
      setSelected(new Set());
    } catch {
      setError('초대 전송에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollScreenFrame contentPaddingBottom={24}>
        <Text variant="screenTitle" tone="primary">
          참가자 초대
        </Text>
        <Spacer size="xs" />
        <Text variant="caption" tone="secondary">
          함께 친 사람을 선택해 초대합니다. 이미 참가 중인 사람은 자동으로 건너뜁니다.
        </Text>
        <Spacer size="sm" />
        <Text variant="meta" tone="tertiary">
          {selected.size}/{JOIN_INVITE_MAX_BATCH}명 선택
        </Text>
        <Spacer size="md" />

        {loading ? (
          <Text variant="body" tone="secondary">
            불러오는 중…
          </Text>
        ) : null}
        {error ? (
          <Text variant="body" tone="error">
            {error}
          </Text>
        ) : null}
        {sentCount != null ? (
          <Text variant="body" tone="secondary" style={{ color: theme.colors.action.primary }}>
            {sentCount}명에게 초대를 보냈습니다.
          </Text>
        ) : null}
        {!loading && people.length === 0 ? (
          <Text variant="body" tone="secondary">
            함께 친 사람이 없습니다. 조인을 완료하면 여기에 표시됩니다.
          </Text>
        ) : null}

        <Stack gap="sm">
          {people.map((person) => {
            const isSelected = selected.has(person.userId);
            const last = new Date(person.lastPlayedAt).toLocaleDateString('ko-KR', {
              timeZone: 'Asia/Seoul',
            });
            return (
              <Pressable
                key={person.userId}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                onPress={() => toggle(person.userId)}
                style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
              >
                <Card
                  variant={isSelected ? 'elevated' : 'base'}
                  padding="md"
                  style={[
                    styles.card,
                    isSelected
                      ? { borderColor: theme.colors.action.primary, borderWidth: 1 }
                      : null,
                  ]}
                >
                  <Stack gap="xs">
                    <Text variant="bodyStrong" tone="primary">
                      {person.nickname}
                      {person.verifiedBadge ? ' · 인증' : ''}
                    </Text>
                    <Text variant="caption" tone="secondary">
                      {[person.regionLabel, `함께 ${person.playedCount}회`, `최근 ${last}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                    {person.attendanceRatePercent != null ? (
                      <Badge
                        label={`참석률 ${person.attendanceRatePercent}%`}
                        variant="neutral"
                      />
                    ) : null}
                  </Stack>
                </Card>
              </Pressable>
            );
          })}
        </Stack>
      </ScrollScreenFrame>

      <StickyActionFrame>
        <Button
          label="초대 보내기"
          loading={busy}
          disabled={selected.size === 0}
          onPress={() => void onSend()}
        />
        <Button label="닫기" variant="ghost" onPress={() => router.back()} />
      </StickyActionFrame>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: { gap: 4 },
});
