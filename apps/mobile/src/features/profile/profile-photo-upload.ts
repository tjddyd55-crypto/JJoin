import { File, UploadType } from 'expo-file-system';
import { ApiRequestError } from '@jjoin/api-client';
import type { MeDto } from '@jjoin/types';
import { getApiBaseUrl } from '../../lib/api';

type ProfilePhotoUploadPath = '/me/profile/photo' | '/me/profile/photos';

type UploadableProfilePhoto = {
  uri: string;
  name?: string;
  type?: string;
};

/**
 * RN 0.86 fetch + FormData does not accept `{ uri, name, type }` file parts
 * ("Unsupported FormDataPart implementation"). Use expo-file-system native upload.
 */
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
  if (__DEV__) {
    console.log('[profile-photo-upload] start', {
      path,
      uri: file.uri,
      type: file.type,
      name: file.name,
    });
  }

  const uploadFile = new File(file.uri);
  const result = await uploadFile.upload(`${baseUrl}${path}`, {
    httpMethod: 'POST',
    uploadType: UploadType.MULTIPART,
    fieldName: 'file',
    mimeType: file.type ?? 'image/jpeg',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (__DEV__) {
    console.log('[profile-photo-upload] response', { status: result.status });
  }

  if (result.status < 200 || result.status >= 300) {
    throw new ApiRequestError(result.status, result.body);
  }

  return JSON.parse(result.body) as MeDto;
}
