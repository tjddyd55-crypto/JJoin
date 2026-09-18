import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  ProfileAvatar,
  Spacer,
  Text,
} from '@jjoin/design-system';
import { MAX_PROFILE_GALLERY_PHOTOS } from '@jjoin/domain';
import type { ProfilePhotoDto } from '@jjoin/types';
import { Image, Pressable } from 'react-native';
import { ProfileGallerySliderModal } from './ProfileGallerySliderModal';

type Props = {
  avatarUrl: string | null;
  nickname: string;
  gallery: ProfilePhotoDto[];
  loading?: boolean;
  onPickAvatar: () => void;
  onDeleteAvatar: () => void;
  onAddGalleryPhoto: () => void;
  onDeleteGalleryPhoto: (photoId: string) => void;
  onMoveGalleryPhoto: (photoId: string, direction: 'left' | 'right') => void;
  onSetPrimaryGalleryPhoto?: (photoId: string) => void;
};

export function ProfilePhotoEditorSection({
  avatarUrl,
  nickname,
  gallery,
  loading = false,
  onPickAvatar,
  onDeleteAvatar,
  onAddGalleryPhoto,
  onDeleteGalleryPhoto,
  onMoveGalleryPhoto,
  onSetPrimaryGalleryPhoto,
}: Props) {
  const hasAvatar = Boolean(avatarUrl);
  const canAddGallery = gallery.length < MAX_PROFILE_GALLERY_PHOTOS;
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const gallerySlides = useMemo(
    () =>
      gallery
        .filter((photo) => Boolean(photo.imageUrl))
        .map((photo) => ({ id: photo.id, imageUrl: photo.imageUrl as string })),
    [gallery],
  );

  return (
    <View>
      <Text variant="label" tone="secondary">프로필 사진 (선택)</Text>
      <Spacer size="sm" />
      <View style={styles.avatarRow}>
        <ProfileAvatar imageUrl={avatarUrl} name={nickname} size="lg" />
        <View style={styles.avatarActions}>
          <Button
            label={hasAvatar ? '사진 변경' : '사진 추가'}
            variant="secondary"
            size="sm"
            fullWidth={false}
            loading={loading}
            onPress={onPickAvatar}
          />
          {hasAvatar ? (
            <Button
              label="삭제"
              variant="ghost"
              size="sm"
              fullWidth={false}
              loading={loading}
              onPress={onDeleteAvatar}
            />
          ) : null}
        </View>
      </View>

      <Spacer size="md" />
      <Text variant="label" tone="secondary">추가 사진 (선택)</Text>
      <Text variant="caption" tone="tertiary">
        최대 {MAX_PROFILE_GALLERY_PHOTOS}장 · 여러 장 한 번에 선택 가능
      </Text>
      <Spacer size="sm" />
      <View style={styles.galleryGrid}>
        {gallery.map((photo, index) => (
          <View key={photo.id} style={styles.galleryItem}>
            {photo.imageUrl ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="사진 크게 보기"
                disabled={loading}
                onPress={() => {
                  const slideIndex = gallerySlides.findIndex((slide) => slide.id === photo.id);
                  if (slideIndex >= 0) {
                    setViewerIndex(slideIndex);
                  }
                }}
              >
                <Image source={{ uri: photo.imageUrl }} style={styles.galleryImage} />
              </Pressable>
            ) : (
              <View style={styles.galleryFallback} />
            )}
            <View style={styles.galleryControls}>
              <Pressable
                accessibilityRole="button"
                disabled={index === 0 || loading}
                onPress={() => onMoveGalleryPhoto(photo.id, 'left')}
              >
                <Text variant="caption" tone="link">←</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={loading}
                onPress={() => onDeleteGalleryPhoto(photo.id)}
              >
                <Text variant="caption" tone="error">삭제</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={index === gallery.length - 1 || loading}
                onPress={() => onMoveGalleryPhoto(photo.id, 'right')}
              >
                <Text variant="caption" tone="link">→</Text>
              </Pressable>
            </View>
            {onSetPrimaryGalleryPhoto ? (
              <Pressable
                accessibilityRole="button"
                disabled={loading || photo.isPrimary}
                onPress={() => onSetPrimaryGalleryPhoto(photo.id)}
              >
                <Text variant="caption" tone={photo.isPrimary ? 'success' : 'link'}>
                  {photo.isPrimary ? '대표 사진' : '대표로 설정'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
      {canAddGallery ? (
        <>
          <Spacer size="sm" />
          <Button
            label="사진 추가"
            variant="secondary"
            size="sm"
            fullWidth={false}
            loading={loading}
            onPress={onAddGalleryPhoto}
          />
        </>
      ) : null}

      <ProfileGallerySliderModal
        visible={viewerIndex != null}
        slides={gallerySlides}
        initialIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarActions: {
    flex: 1,
    gap: 8,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  galleryItem: {
    width: 104,
    gap: 6,
  },
  galleryImage: {
    width: 104,
    height: 104,
    borderRadius: 12,
  },
  galleryFallback: {
    width: 104,
    height: 104,
    borderRadius: 12,
    backgroundColor: '#E8EDF2',
  },
  galleryControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
