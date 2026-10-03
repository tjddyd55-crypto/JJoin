import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Section, Stack, Text } from '@jjoin/design-system';
import { evaluateJoinSessionReviewAuthorEligibility } from '@jjoin/domain';
import type { JoinDetailDto, JoinSessionReviewDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';

type Props = {
  joinId: string;
  detail: JoinDetailDto;
};

function formatReviewDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function JoinSessionReviewsSection({ joinId, detail }: Props) {
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [reviews, setReviews] = useState<JoinSessionReviewDto[]>([]);
  const [mine, setMine] = useState<JoinSessionReviewDto | null>(null);
  const [loading, setLoading] = useState(true);

  const participationStatus = detail.myParticipation?.participationStatus ?? '';
  const canAuthor = evaluateJoinSessionReviewAuthorEligibility({
    joinStatus: detail.status,
    scheduledEndAt: detail.scheduledEndAt,
    participationStatus,
  }).ok;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, my] = await Promise.all([
        api.listJoinSessionReviews(joinId),
        canAuthor ? api.getMyJoinSessionReview(joinId) : Promise.resolve(null),
      ]);
      setReviews(list);
      setMine(my);
    } catch {
      setReviews([]);
      setMine(null);
    } finally {
      setLoading(false);
    }
  }, [api, joinId, canAuthor]);

  useEffect(() => {
    void load();
  }, [load]);

  const writeLabel = mine ? '내 후기 수정' : '후기 작성';

  return (
    <Section title="쪼인 후기">
      {loading ? (
        <Text variant="body" tone="secondary">
          불러오는 중…
        </Text>
      ) : null}
      {!loading && canAuthor ? (
        <Button
          label={writeLabel}
          variant={mine ? 'secondary' : 'primary'}
          onPress={() => router.push(`/join/${joinId}/session-review`)}
        />
      ) : null}
      {!loading && reviews.length === 0 ? (
        <Text variant="body" tone="secondary">
          아직 등록된 후기가 없습니다.
        </Text>
      ) : null}
      <Stack gap="md">
        {reviews.map((review) => (
          <Card key={review.reviewId} variant="elevated" padding="md">
            <Stack gap="sm">
              <Text variant="bodyStrong" tone="primary">
                {review.authorNickname}
              </Text>
              <Text variant="caption" tone="tertiary">
                {formatReviewDate(review.createdAt)}
              </Text>
              <Text variant="bodyStrong" tone="primary">
                {review.title}
              </Text>
              <Text variant="body" tone="secondary" numberOfLines={4}>
                {review.content}
              </Text>
              {review.photos.length > 0 ? (
                <View style={styles.photoRow}>
                  {review.photos.map((photo) => (
                    <Image key={photo.photoId} source={{ uri: photo.imageUrl }} style={styles.thumb} />
                  ))}
                </View>
              ) : null}
              {mine?.reviewId === review.reviewId ? (
                <Pressable onPress={() => router.push(`/join/${joinId}/session-review`)}>
                  <Text variant="caption" tone="secondary">
                    내 후기 보기
                  </Text>
                </Pressable>
              ) : null}
            </Stack>
          </Card>
        ))}
      </Stack>
    </Section>
  );
}

const styles = StyleSheet.create({
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 56, height: 56, borderRadius: 8 },
});
