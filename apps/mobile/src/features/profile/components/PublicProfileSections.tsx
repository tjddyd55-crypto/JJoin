import { Image, Pressable, StyleSheet, View } from 'react-native';
import {
  Badge,
  JoinDetailCard,
  JoinDetailSection,
  JoinMiniStatGrid,
  ProfileAvatar,
  StatusBadge,
  Text,
  spacing,
  useTheme,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import type { PlayerReviewPublicDto, ProfilePhotoDto } from '@jjoin/types';
import { StarRatingDisplay } from '../../../ui/patterns/StarRating';
import type { PublicProfileDisplayModel, PublicProfileFact } from '../model/public-profile-display';

type IdentityProps = {
  model: PublicProfileDisplayModel;
};

export function PublicProfileIdentityHeader({ model }: IdentityProps) {
  return (
    <JoinDetailCard>
      <View style={styles.header}>
        <ProfileAvatar imageUrl={model.avatarUrl} name={model.nickname} size="lg" />
        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <Text variant="joinCardTitle" tone="primary" numberOfLines={1} style={styles.name}>
              {model.nickname}
            </Text>
            {model.verified ? <StatusBadge label={t('profile.verified')} tone="success" /> : null}
          </View>
          {model.demographicLine ? (
            <Text variant="joinMeta" tone="secondary">
              {model.demographicLine}
            </Text>
          ) : null}
          {model.ratingLine ? (
            <Text variant="body" tone="primary">
              {model.ratingLine}
            </Text>
          ) : (
            <Text variant="body" tone="secondary">
              아직 받은 평가가 없습니다
            </Text>
          )}
          {model.playedTogetherLine ? (
            <Text variant="caption" tone="secondary">
              {model.playedTogetherLine}
            </Text>
          ) : null}
        </View>
      </View>
    </JoinDetailCard>
  );
}

export function PublicProfileGallerySection({
  photos,
  onOpenPhoto,
}: {
  photos: ProfilePhotoDto[];
  onOpenPhoto: (photoId: string) => void;
}) {
  if (photos.length === 0) return null;

  return (
    <JoinDetailSection title="사진">
      <View style={styles.galleryRow}>
        {photos.map((photo) =>
          photo.imageUrl ? (
            <Pressable
              key={photo.id}
              accessibilityRole="button"
              accessibilityLabel="사진 크게 보기"
              onPress={() => onOpenPhoto(photo.id)}
            >
              <Image source={{ uri: photo.imageUrl }} style={styles.galleryThumb} />
            </Pressable>
          ) : null,
        )}
      </View>
    </JoinDetailSection>
  );
}

export function PublicProfileIntroSection({ paragraphs }: { paragraphs: string[] }) {
  if (paragraphs.length === 0) return null;

  return (
    <JoinDetailSection title="소개">
      {paragraphs.map((paragraph, index) => (
        <Text key={`${index}:${paragraph}`} variant="body" tone="primary">
          {paragraph}
        </Text>
      ))}
    </JoinDetailSection>
  );
}

export function PublicProfileFactSection({
  title,
  facts,
}: {
  title: string;
  facts: PublicProfileFact[];
}) {
  if (facts.length === 0) return null;

  return (
    <JoinDetailSection title={title}>
      <JoinMiniStatGrid items={facts} />
    </JoinDetailSection>
  );
}

export function PublicProfileActivitySection({
  trustLabel,
  trustVariant,
  stats,
}: {
  trustLabel: string | null;
  trustVariant: PublicProfileDisplayModel['trustVariant'];
  stats: PublicProfileFact[];
}) {
  return (
    <JoinDetailSection title="조인 활동">
      {trustLabel ? <Badge label={trustLabel} variant={trustVariant} /> : null}
      <JoinMiniStatGrid items={stats} />
    </JoinDetailSection>
  );
}

export function PublicProfileReviewsSection({ reviews }: { reviews: PlayerReviewPublicDto[] }) {
  const theme = useTheme();

  return (
    <JoinDetailSection title="받은 한줄평">
      {reviews.length === 0 ? (
        <Text variant="body" tone="secondary">
          아직 작성된 한줄평이 없습니다.
        </Text>
      ) : (
        reviews.map((review) => (
          <View
            key={review.reviewId}
            style={[
              styles.reviewCard,
              {
                backgroundColor: theme.colors.surface.soft,
                borderRadius: theme.radius.md,
              },
            ]}
          >
            <StarRatingDisplay rating={review.rating} />
            <Text variant="body" tone="primary">
              "{review.comment}"
            </Text>
            <Text variant="caption" tone="secondary">
              {new Date(review.createdAt).toLocaleDateString('ko-KR', {
                timeZone: 'Asia/Seoul',
              })}
            </Text>
          </View>
        ))
      )}
    </JoinDetailSection>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    flexShrink: 1,
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
    padding: spacing.sm,
  },
});
