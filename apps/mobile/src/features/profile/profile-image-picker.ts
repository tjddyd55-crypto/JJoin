import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import type { PickedProfileImage } from './profile-image-upload-payload';

export type { PickedProfileImage } from './profile-image-upload-payload';
export { toUploadPayload } from './profile-image-upload-payload';

export type ProfileImagePickResult =
  | { status: 'ok'; image: PickedProfileImage }
  | { status: 'cancelled' }
  | { status: 'permission_denied' }
  | { status: 'error'; message: string };

export type ProfileImagesPickResult =
  | { status: 'ok'; images: PickedProfileImage[] }
  | { status: 'cancelled' }
  | { status: 'permission_denied' }
  | { status: 'error'; message: string };

type ImagePickerAsset = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

function extensionForMime(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/heic' || mimeType === 'image/heif') return 'jpg';
  return 'jpg';
}

function isNativeImagePickerMissing(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('ExponentImagePicker') ||
    message.includes('native module') ||
    message.includes('NativeModule')
  );
}

async function normalizeUploadUri(uri: string, mimeType: string): Promise<string> {
  if (Platform.OS !== 'android') {
    return uri;
  }
  if (uri.startsWith('file://')) {
    return uri;
  }
  const FileSystem = await import('expo-file-system/legacy');
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    return uri;
  }
  const dest = `${cacheDir}profile-upload-${Date.now()}.${extensionForMime(mimeType)}`;
  if (__DEV__) {
    console.log('[profile-image-picker] normalizeUploadUri', { from: uri, to: dest });
  }
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

async function mapAssetToPickedImage(asset: ImagePickerAsset): Promise<PickedProfileImage> {
  const mimeType = asset.mimeType ?? 'image/jpeg';
  const ext = extensionForMime(mimeType);
  const fileName = asset.fileName?.trim() || `profile-${Date.now()}.${ext}`;
  const uri = await normalizeUploadUri(asset.uri, mimeType);
  return { uri, mimeType, fileName };
}

function isImagePickerNativeModuleAvailable(): boolean {
  return requireOptionalNativeModule('ExponentImagePicker') != null;
}

type PickMode = 'single' | 'multiple';

async function pickProfileImagesFromLibraryInternal(
  mode: PickMode,
  selectionLimit: number,
): Promise<ProfileImagesPickResult> {
  if (!isImagePickerNativeModuleAvailable()) {
    return { status: 'error', message: 'profile_image_native_module_missing' };
  }

  try {
    const ImagePicker = await import('expo-image-picker');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return { status: 'permission_denied' };
    }

    const isMultiple = mode === 'multiple' && selectionLimit > 1;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
      ...(isMultiple
        ? {
            allowsMultipleSelection: true,
            selectionLimit,
          }
        : {
            selectionLimit: 1,
            ...(Platform.OS === 'android' ? { legacy: true } : {}),
          }),
    });

    if (result.canceled || !result.assets?.length) {
      return { status: 'cancelled' };
    }

    const assets = result.assets.slice(0, selectionLimit);
    const images = await Promise.all(assets.map((asset) => mapAssetToPickedImage(asset)));

    return { status: 'ok', images };
  } catch (error) {
    if (__DEV__) {
      console.warn('[profile-image-picker]', error);
    }
    if (isNativeImagePickerMissing(error)) {
      return { status: 'error', message: 'profile_image_native_module_missing' };
    }
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : 'profile_image_pick_failed';
    return { status: 'error', message };
  }
}

/** 대표 프로필 사진 — 단일 선택 */
export async function pickProfileImageFromLibrary(): Promise<ProfileImagePickResult> {
  const picked = await pickProfileImagesFromLibraryInternal('single', 1);
  if (picked.status === 'ok') {
    return { status: 'ok', image: picked.images[0] };
  }
  return picked;
}

/** 갤러리 추가 사진 — 다중 선택 (남은 슬롯 수까지) */
export async function pickProfileGalleryImagesFromLibrary(
  selectionLimit: number,
): Promise<ProfileImagesPickResult> {
  const limit = Math.max(1, Math.floor(selectionLimit));
  if (limit <= 1) {
    const single = await pickProfileImageFromLibrary();
    if (single.status === 'ok') {
      return { status: 'ok', images: [single.image] };
    }
    return single;
  }
  return pickProfileImagesFromLibraryInternal('multiple', limit);
}
