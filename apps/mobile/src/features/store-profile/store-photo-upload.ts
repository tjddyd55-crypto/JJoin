import { File, UploadType } from 'expo-file-system';
import { ApiRequestError } from '@jjoin/api-client';
import type { StoreProfileDto } from '@jjoin/types';
import { getApiBaseUrl } from '../../lib/api';

type UploadableStorePhoto = {
  uri: string;
  name?: string;
  type?: string;
};

export async function uploadStoreProfilePhotoMultipart(
  ownershipId: string,
  file: UploadableStorePhoto,
  getAccessToken: () => Promise<string | null>,
): Promise<StoreProfileDto> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error('network_error:api_base_url_missing');
  }

  const token = await getAccessToken();
  const path = `/me/stores/${ownershipId}/profile/photos`;
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

  if (result.status < 200 || result.status >= 300) {
    throw new ApiRequestError(result.status, result.body);
  }

  return JSON.parse(result.body) as StoreProfileDto;
}
