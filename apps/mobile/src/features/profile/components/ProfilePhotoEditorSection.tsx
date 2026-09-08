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
}: Props) {
  const hasAvatar = Boolean(avatarUrl);
  const canAddGallery = gallery.length < MAX_PROFILE_GALLERY_PHOTOS;

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
            loading={loading}
            onPress={onPickAvatar}
          />
          {hasAvatar ? (
            <Button
              label="삭제"
              variant="ghost"
              loading={loading}
              onPress={onDeleteAvatar}
            />
          ) : null}
        </View>
      </View>

      <Spacer size="md" />
      <Text variant="label" tone="secondary">추가 사진 (선택)</Text>
      <Text variant="caption" tone="tertiary">최대 {MAX_PROFILE_GALLERY_PHOTOS}장</Text>
      <Spacer size="sm" />
      <View style={styles.galleryGrid}>
        {gallery.map((photo, index) => (
          <View key={photo.id} style={styles.galleryItem}>
            {photo.imageUrl ? (
              <Image source={{ uri: photo.imageUrl }} style={styles.galleryImage} />
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
          </View>
        ))}
      </View>
      {canAddGallery ? (
        <>
          <Spacer size="sm" />
          <Button
            label="추가 사진 등록"
            variant="secondary"
            loading={loading}
            onPress={onAddGalleryPhoto}
          />
        </>
      ) : null}
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
