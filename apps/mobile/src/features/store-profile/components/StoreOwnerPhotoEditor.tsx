import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { Button, Chip, Text, spacing, useTheme } from '@jjoin/design-system';
import type { StoreProfileDto } from '@jjoin/types';
import { pickProfileGalleryImagesFromLibrary } from '../../profile/profile-image-picker';
import { STORE_MAX_PHOTOS } from '@jjoin/domain';
import { uploadStoreProfilePhotoMultipart } from '../store-photo-upload';

type Props = {
  ownershipId: string;
  profile: StoreProfileDto;
  getAccessToken: () => Promise<string | null>;
  onUpdated: (profile: StoreProfileDto) => void;
  onDeletePhoto: (photoId: string) => Promise<void>;
  onSetCover: (photoId: string) => Promise<void>;
};

export function StoreOwnerPhotoEditor({
  ownershipId,
  profile,
  getAccessToken,
  onUpdated,
  onDeletePhoto,
  onSetCover,
}: Props) {
  const theme = useTheme();

  async function addPhotos() {
    const remaining = Math.max(1, STORE_MAX_PHOTOS - profile.photos.length);
    const picked = await pickProfileGalleryImagesFromLibrary(remaining);
    if (picked.status !== 'ok' || picked.images.length === 0) return;
    try {
      let next = profile;
      for (const file of picked.images) {
        next = await uploadStoreProfilePhotoMultipart(ownershipId, file, getAccessToken);
      }
      onUpdated(next);
    } catch {
      Alert.alert('사진 업로드에 실패했습니다.');
    }
  }

  const allPhotos = profile.photos;

  return (
    <View style={styles.wrap}>
      <Text variant="label">매장 사진 (최대 10장)</Text>
      <View style={styles.grid}>
        {allPhotos.map((photo) => (
          <View key={photo.id} style={styles.tile}>
            {photo.imageUrl ? (
              <Image source={{ uri: photo.imageUrl }} style={styles.thumb} />
            ) : null}
            {photo.isCover ? <Chip label="대표" selected style={styles.coverBadge} /> : null}
            <View style={styles.tileActions}>
              {!photo.isCover ? (
                <Pressable onPress={() => void onSetCover(photo.id)}>
                  <Text tone="secondary">대표</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => void onDeletePhoto(photo.id)}>
                <Text tone="error">삭제</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
      <Button label="사진 추가" variant="secondary" onPress={() => void addPhotos()} />
      {profile.coverImageUrl && allPhotos.length === 0 ? (
        <View style={[styles.coverOnly, { backgroundColor: theme.colors.surface.elevated }]}>
          <Image source={{ uri: profile.coverImageUrl }} style={styles.thumb} />
          <Text tone="secondary">대표 사진</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { width: 96, gap: 4 },
  thumb: { width: 96, height: 72, borderRadius: 8 },
  tileActions: { flexDirection: 'row', justifyContent: 'space-between' },
  coverBadge: { position: 'absolute', top: 4, left: 4 },
  coverOnly: { padding: spacing.sm, borderRadius: 8, gap: 4 },
});
