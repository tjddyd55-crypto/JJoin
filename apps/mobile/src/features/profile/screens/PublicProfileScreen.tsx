import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AppText,
  ProfileAvatar,
  ScrollScreenFrame,
  Stack,
  StatusBadge,
  spacing,
} from '@jjoin/design-system';
import {
  formatDrinkingHabitLabel,
  formatFieldHandicap,
  formatScreenHandicap,
  formatSmokingHabitLabel,
} from '@jjoin/domain';
import { t } from '@jjoin/i18n';
import type { PlayerReviewPublicDto, PublicUserProfileDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { createExpoSecureSessionStore } from '../../../session/expo-secure-session-store';
import { useSession } from '../../../session/SessionContext';
import { StarRatingDisplay } from '../../../ui/patterns/StarRating';
import { MemberActionMenu } from '../../member/components/MemberActionMenu';
import { ProfileEditCtaButton } from '../components/ProfileEditCtaButton';
import { ProfileGallerySliderModal } from '../components/ProfileGallerySliderModal';
import { listRenderableProfilePhotos } from '../profile-gallery';

const store = createExpoSecureSessionStore();

export function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { me } = useSession();
  const [profile, setProfile] = useState<PublicUserProfileDto | null>(null);
  const [reviews, setReviews] = useState<PlayerReviewPublicDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [galleryViewerIndex, setGalleryViewerIndex] = useState<number | null>(null);

  const isOwnProfile = useMemo(
    () => Boolean(userId && me?.publicProfile?.id && userId === me.publicProfile.id),
    [me?.publicProfile?.id, userId],
  );

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

  const gallery = useMemo(
    () => listRenderableProfilePhotos(profile?.profilePhotos),
    [profile?.profilePhotos],
  );
  const gallerySlides = useMemo(
    () => gallery.map((photo) => ({ id: photo.id, imageUrl: photo.imageUrl })),
    [gallery],
  );

  if (loading) {
    return (
      <ScrollScreenFrame edges={['top', 'left', 'right', 'bottom']} contentPaddingBottom={spacing.xl}>
        <AppText>{t('common.loading')}</AppText>
      </ScrollScreenFrame>
    );
  }

  if (error || !profile) {
    return (
      <ScrollScreenFrame edges={['top', 'left', 'right', 'bottom']} contentPaddingBottom={spacing.xl}>
        <AppText color="danger">{error ?? t('common.empty')}</AppText>
      </ScrollScreenFrame>
    );
  }

  const skill = profile.sportProfiles.find((s) => s.sportCode === 'SCREEN_GOLF');
  const hasReviews = (profile.reviewCount ?? 0) > 0 && profile.averageRatingDisplay;

  return (
    <ScrollScreenFrame edges={['top', 'left', 'right', 'bottom']} contentPaddingBottom={spacing.xl}>
      <Stack gap="md">
        <View style={styles.titleRow}>
          <AppText variant="title">{t('profile.public.title')}</AppText>
          {isOwnProfile ? (
            <ProfileEditCtaButton onPress={() => router.push('/my/edit-profile')} />
          ) : null}
        </View>
        <View style={styles.header}>
          <ProfileAvatar imageUrl={profile.avatarUrl} name={profile.nickname} size="lg" />
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
        <MemberActionMenu
          targetUserId={profile.id}
          nickname={profile.nickname}
          viewerUserId={me?.userId ?? me?.publicProfile?.id}
          variant="cta"
          coinGiftEnabled={me?.featureFlags?.coinGiftEnabled !== false}
          messagingEnabled={me?.messagePolicy?.enabled !== false}
        />
        {gallery.length > 0 ? (
          <View style={styles.gallerySection}>
            <AppText variant="label" color="textSecondary">사진</AppText>
            <View style={styles.galleryRow}>
              {gallery.map((photo) =>
                photo.imageUrl ? (
                  <Pressable
                    key={photo.id}
                    accessibilityRole="button"
                    accessibilityLabel="사진 크게 보기"
                    onPress={() => {
                      const slideIndex = gallerySlides.findIndex((slide) => slide.id === photo.id);
                      if (slideIndex >= 0) {
                        setGalleryViewerIndex(slideIndex);
                      }
                    }}
                  >
                    <Image source={{ uri: photo.imageUrl }} style={styles.galleryThumb} />
                  </Pressable>
                ) : null,
              )}
            </View>
          </View>
        ) : null}
        <AppText variant="body" color="textSecondary">
          {[profile.genderDisplay, profile.ageBand, profile.regionLabel]
            .filter(Boolean)
            .join(' · ') || '-'}
        </AppText>
        {profile.bio ? <AppText variant="body">{profile.bio}</AppText> : null}
        {profile.personality ? <AppText variant="body">{profile.personality}</AppText> : null}
        {profile.age != null ? <AppText variant="body">나이 {profile.age}</AppText> : null}
        {profile.heightCm != null ? (
          <AppText variant="body">키 {profile.heightCm}cm</AppText>
        ) : null}
        {formatDrinkingHabitLabel(profile.drinking) ? (
          <AppText variant="body">{formatDrinkingHabitLabel(profile.drinking)}</AppText>
        ) : null}
        {formatSmokingHabitLabel(profile.smoking) ? (
          <AppText variant="body">{formatSmokingHabitLabel(profile.smoking)}</AppText>
        ) : null}
        <AppText variant="label" color="textSecondary">
          필드 핸디
        </AppText>
        <AppText variant="body">
          {formatFieldHandicap(skill?.fieldHandicap ?? null) ?? '미설정'}
        </AppText>
        <AppText variant="label" color="textSecondary">
          스크린 핸디
        </AppText>
        <AppText variant="body">
          {formatScreenHandicap(skill?.screenHandicap ?? null) ?? '미설정'}
        </AppText>
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

      <ProfileGallerySliderModal
        visible={galleryViewerIndex != null}
        slides={gallerySlides}
        initialIndex={galleryViewerIndex ?? 0}
        onClose={() => setGalleryViewerIndex(null)}
      />
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  gallerySection: {
    gap: spacing.sm,
  },
  galleryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  galleryThumb: {
    width: 88,
    height: 88,
    borderRadius: 12,
  },
  reviewCard: {
    gap: spacing.xs,
  },
});
