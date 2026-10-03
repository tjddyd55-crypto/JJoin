import type { MeDto } from '@jjoin/types';
import { getApiBaseUrl } from '../../lib/api';
import { uploadMultipartNative } from '../../lib/native-multipart-upload';

type ProfilePhotoUploadPath = '/me/profile/photo' | '/me/profile/photos';

type UploadableProfilePhoto = {
  uri: string;
  name?: string;
  type?: string;
};

export async function uploadProfilePhotoMultipart(
  path: ProfilePhotoUploadPath,
  file: UploadableProfilePhoto,
  getAccessToken: () => Promise<string | null>,
): Promise<MeDto> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error('network_error:api_base_url_missing');
  }

  const token = await getAccessToken();
  return uploadMultipartNative<MeDto>(`${baseUrl}${path}`, 'file', file, {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });
}
