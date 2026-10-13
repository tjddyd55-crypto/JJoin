import { useEffect, useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Row, ScrollScreenFrame, Stack, Text, spacing } from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import type { PlayerReviewPublicDto, PublicUserProfileDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { createExpoSecureSessionStore } from '../../../session/expo-secure-session-store';
import { useSession } from '../../../session/SessionContext';
import { MemberActionMenu } from '../../member/components/MemberActionMenu';
import { ProfileEditCtaButton } from '../components/ProfileEditCtaButton';
import { ProfileGallerySliderModal } from '../components/ProfileGallerySliderModal';
import {
  PublicProfileActivitySection,
  PublicProfileFactSection,
  PublicProfileGallerySection,
  PublicProfileIdentityHeader,
  PublicProfileIntroSection,
  PublicProfileReviewsSection,
} from '../components/PublicProfileSections';
import { buildPublicProfileDisplay } from '../model/public-profile-display';

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

  const gallerySlides = useMemo(
    () =>
      (profile?.profilePhotos ?? [])
        .filter((photo) => Boolean(photo.imageUrl))
        .map((photo) => ({ id: photo.id, imageUrl: photo.imageUrl as string })),
    [profile?.profilePhotos],
  );

  const display = useMemo(
    () => (profile ? buildPublicProfileDisplay(profile) : null),
    [profile],
  );

  if (loading) {
    return (
      <ScrollScreenFrame edges={['top', 'left', 'right', 'bottom']} contentPaddingBottom={spacing.xl}>
        <Text>{t('common.loading')}</Text>
      </ScrollScreenFrame>
    );
  }

  if (error || !profile || !display) {
    return (
      <ScrollScreenFrame edges={['top', 'left', 'right', 'bottom']} contentPaddingBottom={spacing.xl}>
        <Text tone="error">{error ?? t('common.empty')}</Text>
      </ScrollScreenFrame>
    );
  }

  return (
    <ScrollScreenFrame edges={['top', 'left', 'right', 'bottom']} contentPaddingBottom={spacing.xl}>
      <Stack gap="lg">
        <Stack gap="sm">
          <Row align="center" justify="space-between" gap="sm">
            <Text variant="joinScreenTitle">{t('profile.public.title')}</Text>
            {isOwnProfile ? (
              <ProfileEditCtaButton onPress={() => router.push('/my/edit-profile')} />
            ) : null}
          </Row>
          <PublicProfileIdentityHeader model={display} />
        </Stack>

        <MemberActionMenu
          targetUserId={profile.id}
          nickname={profile.nickname}
          viewerUserId={me?.userId ?? me?.publicProfile?.id}
          variant="cta"
          coinGiftEnabled={me?.featureFlags?.coinGiftEnabled !== false}
          messagingEnabled={me?.messagePolicy?.enabled !== false}
        />

        <PublicProfileGallerySection
          photos={profile.profilePhotos ?? []}
          onOpenPhoto={(photoId) => {
            const slideIndex = gallerySlides.findIndex((slide) => slide.id === photoId);
            if (slideIndex >= 0) setGalleryViewerIndex(slideIndex);
          }}
        />
        <PublicProfileIntroSection paragraphs={display.introParagraphs} />
        <PublicProfileFactSection title="기본 정보" facts={display.basicFacts} />
        <PublicProfileFactSection title="골프" facts={display.golfFacts} />
        <PublicProfileActivitySection
          trustLabel={display.trustLabel}
          trustVariant={display.trustVariant}
          stats={display.activityStats}
        />
        <PublicProfileReviewsSection reviews={reviews} />

        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text variant="caption" tone="link">
            돌아가기
          </Text>
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
