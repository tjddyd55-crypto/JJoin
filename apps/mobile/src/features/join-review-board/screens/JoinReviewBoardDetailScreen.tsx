import { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Button, ProfileAvatar, Stack, Text, spacing, useTheme } from '@jjoin/design-system';
import type { JoinReviewPostDetailDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { ScrollScreenFrame } from '@jjoin/design-system';
import { formatJoinReviewBoardDate } from '../format-review-date';

export function JoinReviewBoardDetailScreen() {
  const { reviewId } = useLocalSearchParams<{ reviewId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [post, setPost] = useState<JoinReviewPostDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!reviewId) return;
    setLoading(true);
    try {
      setPost(await api.getJoinReviewPost(reviewId));
      setError(null);
    } catch {
      setPost(null);
      setError('후기를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [api, reviewId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openMenu = () => {
    if (!post?.isMine) return;
    Alert.alert('내 후기', undefined, [
      { text: '수정', onPress: () => router.push(`/reviews/${reviewId}/edit` as Href) },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          Alert.alert('후기 삭제', '이 후기를 삭제할까요?', [
            { text: '취소', style: 'cancel' },
            {
              text: '삭제',
              style: 'destructive',
              onPress: () => {
                void (async () => {
                  try {
                    await api.deleteJoinReviewPost(reviewId!);
                    router.replace('/reviews' as Href);
                  } catch {
                    Alert.alert('삭제 실패', '후기를 삭제하지 못했습니다.');
                  }
                })();
              },
            },
          ]);
        },
      },
      { text: '취소', style: 'cancel' },
    ]);
  };

  if (loading) {
    return (
      <ScrollScreenFrame>
        <Text tone="secondary">불러오는 중…</Text>
      </ScrollScreenFrame>
    );
  }

  if (error || !post) {
    return (
      <ScrollScreenFrame>
        <Text tone="secondary">{error ?? '후기를 찾을 수 없습니다.'}</Text>
        <Button label="목록으로" variant="secondary" onPress={() => router.replace('/reviews' as Href)} />
      </ScrollScreenFrame>
    );
  }

  return (
    <ScrollScreenFrame>
      <View style={styles.topRow}>
        <Button label="뒤로" variant="secondary" fullWidth={false} onPress={() => router.back()} />
        {post.isMine ? (
          <Pressable accessibilityRole="button" accessibilityLabel="더보기" onPress={openMenu}>
            <Text variant="bodyStrong" tone="primary">⋯</Text>
          </Pressable>
        ) : (
          <View />
        )}
      </View>
      <Stack gap="md">
        <Text variant="screenTitle" tone="primary">{post.title}</Text>
        <View style={styles.authorRow}>
          <ProfileAvatar imageUrl={post.author.avatarUrl} name={post.author.nickname} size="sm" />
          <View>
            <Text variant="bodyStrong" tone="primary">{post.author.nickname}</Text>
            <Text variant="caption" tone="tertiary">
              {formatJoinReviewBoardDate(post.createdAt)}
            </Text>
          </View>
        </View>
        <Text variant="body" tone="primary" style={styles.body}>
          {post.content}
        </Text>
        {post.photos.map((photo) => (
          <Image
            key={photo.photoId}
            source={{ uri: photo.imageUrl }}
            style={[styles.photo, { backgroundColor: theme.colors.surface.soft }]}
            accessibilityIgnoresInvertColors
          />
        ))}
      </Stack>
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  body: { lineHeight: 24 },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12 },
});
