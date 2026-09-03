import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  Button,
  Card,
  FormScreenFrame,
  Row,
  Spacer,
  Stack,
  Text,
  UserAvatar,
  useTheme,
} from '@jjoin/design-system';
import { PLAYER_REVIEW_COMMENT_MAX_LENGTH } from '@jjoin/domain';
import type { JoinReviewTargetDto } from '@jjoin/types';
import { getApiClient } from '../../../src/lib/api';
import { getSecureSessionStore } from '../../../src/session/SessionContext';
import { StarRatingInput } from '../../../src/ui/patterns/StarRating';
import { NESTED_SCREEN_EDGES } from '../../../src/ui/nested-screen';

export default function JoinReviewsScreen() {
  const { joinId } = useLocalSearchParams<{ joinId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [targets, setTargets] = useState<JoinReviewTargetDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { rating: number; comment: string; saving: boolean }>
  >({});

  const load = useCallback(async () => {
    if (!joinId) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await api.listJoinReviewTargets(joinId);
      setTargets(rows);
      const next: Record<string, { rating: number; comment: string; saving: boolean }> = {};
      for (const row of rows) {
        next[row.userId] = {
          rating: row.myReview?.rating ?? 0,
          comment: row.myReview?.comment ?? '',
          saving: false,
        };
      }
      setDrafts(next);
    } catch {
      setError('평가 대상을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [api, joinId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveOne = async (userId: string) => {
    if (!joinId) return;
    const draft = drafts[userId];
    if (!draft || draft.rating < 1) {
      Alert.alert('별점을 선택해 주세요');
      return;
    }
    setDrafts((prev) => ({
      ...prev,
      [userId]: { ...prev[userId]!, saving: true },
    }));
    try {
      await api.upsertPlayerReview(joinId, {
        revieweeUserId: userId,
        rating: draft.rating,
        comment: draft.comment,
      });
      await load();
    } catch {
      Alert.alert('평가 저장에 실패했습니다.');
      setDrafts((prev) => ({
        ...prev,
        [userId]: { ...prev[userId]!, saving: false },
      }));
    }
  };

  return (
    <FormScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Text variant="caption" tone="secondary">
        함께 플레이한 사람에게 별점과 선택 한줄평을 남길 수 있어요. 평가는 건너뛰어도 됩니다.
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
      {!loading && targets.length === 0 ? (
        <Text variant="body" tone="secondary">
          평가할 사람이 없습니다.
        </Text>
      ) : null}
      <Stack gap="md">
        {targets.map((person) => {
          const draft = drafts[person.userId] ?? { rating: 0, comment: '', saving: false };
          const done = Boolean(person.myReview);
          return (
            <Card key={person.userId} variant="elevated" padding="md">
              <Row gap="md" align="center">
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/user/[userId]', params: { userId: person.userId } } as Href)
                  }
                >
                  <UserAvatar uri={person.avatarUrl} name={person.nickname} size="md" />
                </Pressable>
                <Stack gap="xxs" style={styles.meta}>
                  <Text variant="bodyStrong">{person.nickname}</Text>
                  {done ? (
                    <Text variant="caption" tone="secondary">
                      평가 완료 · 수정 가능
                    </Text>
                  ) : null}
                </Stack>
              </Row>
              <Spacer size="sm" />
              <StarRatingInput
                value={draft.rating}
                onChange={(rating) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [person.userId]: { ...prev[person.userId]!, rating },
                  }))
                }
                disabled={draft.saving}
              />
              <Spacer size="sm" />
              <TextInput
                value={draft.comment}
                onChangeText={(comment) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [person.userId]: {
                      ...prev[person.userId]!,
                      comment: comment.slice(0, PLAYER_REVIEW_COMMENT_MAX_LENGTH),
                    },
                  }))
                }
                placeholder="한줄평을 남겨보세요 (선택)"
                placeholderTextColor={theme.colors.text.tertiary}
                maxLength={PLAYER_REVIEW_COMMENT_MAX_LENGTH}
                style={[
                  styles.input,
                  {
                    color: theme.colors.text.primary,
                    borderColor: theme.colors.border.subtle,
                    backgroundColor: theme.colors.surface.elevated,
                  },
                ]}
              />
              <Spacer size="sm" />
              <Button
                label={done ? '수정 저장' : '등록'}
                onPress={() => void saveOne(person.userId)}
                loading={draft.saving}
                disabled={draft.saving || draft.rating < 1}
              />
            </Card>
          );
        })}
      </Stack>
      <Spacer size="lg" />
      <Button label="닫기" variant="secondary" onPress={() => router.back()} />
    </FormScreenFrame>
  );
}

const styles = StyleSheet.create({
  meta: { flex: 1 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
});
