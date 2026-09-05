import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AppText,
  ScreenContainer,
  Stack,
  StatusBadge,
  UserAvatar,
  spacing,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import type { PlayerReviewPublicDto, PublicUserProfileDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { createExpoSecureSessionStore } from '../../../session/expo-secure-session-store';
import { StarRatingDisplay } from '../../../ui/patterns/StarRating';

const store = createExpoSecureSessionStore();

export function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<PublicUserProfileDto | null>(null);
  const [reviews, setReviews] = useState<PlayerReviewPublicDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!userId) {
        setError(t('common.error'));
        setLoading(false);
        return;
      }
      try {
        const api = getApiClient(store);
        const [data, reviewRows] = await Promise.all([
          api.getPublicProfile(userId),
          api.listUserReviews(userId).catch(() => [] as PlayerReviewPublicDto[]),
        ]);
        if (alive) {
          setProfile(data);
          setReviews(reviewRows);
        }
      } catch {
        if (alive) setError(t('common.error'));
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <ScreenContainer>
        <AppText>{t('common.loading')}</AppText>
      </ScreenContainer>
    );
  }

  if (error || !profile) {
    return (
      <ScreenContainer>
        <AppText color="danger">{error ?? t('common.empty')}</AppText>
      </ScreenContainer>
    );
  }

  const skill = profile.sportProfiles.find((s) => s.sportCode === 'SCREEN_GOLF');
  const hasReviews = (profile.reviewCount ?? 0) > 0 && profile.averageRatingDisplay;

  return (
    <ScreenContainer>
      <Stack gap="md">
        <AppText variant="title">{t('profile.public.title')}</AppText>
        <View style={styles.header}>
          <UserAvatar uri={profile.avatarUrl} name={profile.nickname} size="lg" />
          <Stack gap="xs">
            <AppText variant="subtitle">{profile.nickname}</AppText>
            {profile.verifiedBadge ? (
              <StatusBadge label={t('profile.verified')} tone="success" />
            ) : null}
            {hasReviews ? (
              <AppText variant="body">
                ★ {profile.averageRatingDisplay} · 후기 {profile.reviewCount}
              </AppText>
            ) : (
              <AppText variant="body" color="textSecondary">
                아직 받은 평가가 없습니다
              </AppText>
            )}
            {profile.playedCountWithViewer != null && profile.playedCountWithViewer > 0 ? (
              <AppText variant="caption" color="textSecondary">
                함께 {profile.playedCountWithViewer}회 플레이
              </AppText>
            ) : null}
          </Stack>
        </View>
        <AppText variant="body" color="textSecondary">
          {[profile.genderDisplay, profile.ageBand, profile.regionLabel]
            .filter(Boolean)
            .join(' · ') || '-'}
        </AppText>
        {profile.bio ? <AppText variant="body">{profile.bio}</AppText> : null}
        <AppText variant="label" color="textSecondary">
          {t('profile.skill')}
        </AppText>
        <AppText variant="body">{skill?.skillLevel ?? '-'}</AppText>
        <AppText variant="label" color="textSecondary">
          조인 활동
        </AppText>
        {profile.participationTrustLabel ? (
          <AppText variant="bodyStrong">{profile.participationTrustLabel}</AppText>
        ) : null}
        <AppText variant="label" color="textSecondary">
          {t('profile.participationCount')}
        </AppText>
        <AppText variant="body">{String(profile.participationCount)}</AppText>
        <AppText variant="label" color="textSecondary">
          참석
        </AppText>
        <AppText variant="body">{String(profile.completedJoinCount ?? 0)}</AppText>
        <AppText variant="label" color="textSecondary">
          노쇼
        </AppText>
        <AppText variant="body">{String(profile.noShowCount ?? 0)}</AppText>
        <AppText variant="label" color="textSecondary">
          참석률
        </AppText>
        <AppText variant="body">
          {profile.attendanceRatePercent == null
            ? '기록 없음'
            : `${profile.attendanceRatePercent}%`}
        </AppText>

        <AppText variant="label" color="textSecondary">
          받은 한줄평
        </AppText>
        {reviews.length === 0 ? (
          <AppText variant="body" color="textSecondary">
            아직 작성된 한줄평이 없습니다.
          </AppText>
        ) : (
          <Stack gap="sm">
            {reviews.map((review) => (
              <View key={review.reviewId} style={styles.reviewCard}>
                <StarRatingDisplay rating={review.rating} />
                <AppText variant="body">"{review.comment}"</AppText>
                <AppText variant="caption" color="textSecondary">
                  {new Date(review.createdAt).toLocaleDateString('ko-KR', {
                    timeZone: 'Asia/Seoul',
                  })}
                </AppText>
              </View>
            ))}
          </Stack>
        )}

        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <AppText variant="caption" color="primary">
            ← Back
          </AppText>
        </Pressable>
      </Stack>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  reviewCard: {
    gap: spacing.xs,
  },
});
