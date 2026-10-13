import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import type { PickedProfileImage } from '../profile/profile-image-upload-payload';
import { remainingJoinReviewPhotoSlots } from './join-review-photo-helpers';
import { buildReviewPhotoFileName, resolveReviewPhotoMimeType } from './join-review-photo-helpers';
import { logJoinReviewPhotoPicked } from './prepare-review-photo-upload';

export { remainingJoinReviewPhotoSlots } from './join-review-photo-helpers';

export type JoinReviewPhotosPickResult =
  | { status: 'ok'; images: PickedProfileImage[] }
  | { status: 'cancelled' }
  | { status: 'permission_denied' }
  | { status: 'error'; message: string };

function isNativeImagePickerMissing(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('ExponentImagePicker') ||
    message.includes('native module') ||
    message.includes('NativeModule')
  );
}

function isImagePickerNativeModuleAvailable(): boolean {
  return requireOptionalNativeModule('ExponentImagePicker') != null;
}

export async function pickJoinReviewPhotosFromLibrary(
  currentPhotoCount: number,
): Promise<JoinReviewPhotosPickResult> {
  const remaining = remainingJoinReviewPhotoSlots(currentPhotoCount);
  if (remaining <= 0) {
    return { status: 'error', message: 'photo_limit_exceeded' };
  }

  if (!isImagePickerNativeModuleAvailable()) {
    return { status: 'error', message: 'image_picker_native_module_missing' };
  }

  try {
    const ImagePicker = await import('expo-image-picker');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return { status: 'permission_denied' };
    }

    const isMultiple = remaining > 1;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
      ...(Platform.OS === 'android' ? { legacy: true } : {}),
      ...(isMultiple
        ? {
            allowsMultipleSelection: true,
            selectionLimit: remaining,
          }
        : { selectionLimit: 1 }),
    });

    if (result.canceled || !result.assets?.length) {
      return { status: 'cancelled' };
    }

    const assets = result.assets.slice(0, remaining);
    const images: PickedProfileImage[] = assets.map((asset) => {
      logJoinReviewPhotoPicked({
        uri: asset.uri,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
        fileSize: asset.fileSize,
        width: asset.width,
        height: asset.height,
      });
      const mimeType = resolveReviewPhotoMimeType(asset.mimeType);
      const fileName = buildReviewPhotoFileName(mimeType, asset.fileName);
      return { uri: asset.uri, mimeType, fileName };
    });

    return { status: 'ok', images };
  } catch (error) {
    if (isNativeImagePickerMissing(error)) {
      return { status: 'error', message: 'image_picker_native_module_missing' };
    }
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : 'image_pick_failed';
    return { status: 'error', message };
  }
}
