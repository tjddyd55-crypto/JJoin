import * as ImagePicker from 'expo-image-picker';

export type PickedProfileImage = {
  uri: string;
  mimeType: string;
  fileName: string;
};

export async function pickProfileImageFromLibrary(): Promise<PickedProfileImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.9,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  const uri = asset.uri;
  const mimeType = asset.mimeType ?? 'image/jpeg';
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  return {
    uri,
    mimeType,
    fileName: asset.fileName ?? `profile-${Date.now()}.${ext}`,
  };
}

export function toUploadPayload(image: PickedProfileImage) {
  return {
    uri: image.uri,
    type: image.mimeType,
    name: image.fileName,
  };
}
