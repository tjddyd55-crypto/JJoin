import { File, UploadType } from 'expo-file-system';
import { ApiRequestError } from '@jjoin/api-client';

export type NativeMultipartFile = {
  uri: string;
  name?: string;
  type?: string;
};

/**
 * RN fetch + FormData cannot attach `{ uri, name, type }` parts (RN 0.86+).
 * Use expo-file-system native multipart upload — same as profile photo flow.
 */
export async function uploadMultipartNative<T>(
  absoluteUrl: string,
  fieldName: string,
  file: NativeMultipartFile,
  headers: Record<string, string>,
): Promise<T> {
  if (__DEV__) {
    console.log('[native-multipart-upload] start', {
      url: absoluteUrl,
      fieldName,
      uri: file.uri,
      type: file.type,
      name: file.name,
    });
  }

  let uploadFile: File;
  try {
    uploadFile = new File(file.uri);
  } catch (e) {
    if (__DEV__) {
      console.warn('[join-review-photo] upload-failed', {
        code: 'native_upload_init_failed',
        uri: file.uri,
        message: e instanceof Error ? e.message : String(e),
      });
    }
    throw new Error('native_upload_init_failed');
  }
  const uploadPromise = uploadFile.upload(absoluteUrl, {
    httpMethod: 'POST',
    uploadType: UploadType.MULTIPART,
    fieldName,
    mimeType: file.type ?? 'image/jpeg',
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  });
  const result = await Promise.race([
    uploadPromise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('native_upload_timeout')), 60_000);
    }),
  ]);

  if (__DEV__) {
    console.log('[native-multipart-upload] response', {
      status: result.status,
      bodyPreview: result.body.slice(0, 200),
    });
  }

  if (result.status < 200 || result.status >= 300) {
    throw new ApiRequestError(result.status, result.body);
  }

  return JSON.parse(result.body) as T;
}

export async function uploadMultipartNativeRaw(
  absoluteUrl: string,
  fieldName: string,
  file: NativeMultipartFile,
  headers: Record<string, string>,
): Promise<{ status: number; body: string }> {
  let uploadFile: File;
  try {
    uploadFile = new File(file.uri);
  } catch (e) {
    if (__DEV__) {
      console.warn('[join-review-photo] upload-failed', {
        code: 'native_upload_init_failed',
        uri: file.uri,
        message: e instanceof Error ? e.message : String(e),
      });
    }
    throw new Error('native_upload_init_failed');
  }
  const uploadPromise = uploadFile.upload(absoluteUrl, {
    httpMethod: 'POST',
    uploadType: UploadType.MULTIPART,
    fieldName,
    mimeType: file.type ?? 'image/jpeg',
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  });
  const result = await Promise.race([
    uploadPromise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('native_upload_timeout')), 60_000);
    }),
  ]);
  return { status: result.status, body: result.body };
}
