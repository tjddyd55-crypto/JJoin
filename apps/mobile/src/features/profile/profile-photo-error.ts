import { isApiRequestError } from '@jjoin/api-client';

export function messageForProfilePhotoError(error: unknown): string {
  if (isApiRequestError(error)) {
    if (error.status === 401) {
      return '로그인이 필요합니다. 다시 로그인해 주세요.';
    }
    if (error.code === 'object_storage_not_configured') {
      return '서버 사진 저장소가 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (error.code === 'file_required') {
      return '사진 파일을 읽지 못했습니다. 다른 사진으로 다시 시도해 주세요.';
    }
    if (error.code === 'profile_gallery_limit_reached') {
      return '추가 사진은 최대 5장까지 등록할 수 있습니다.';
    }
    if (error.apiMessage) {
      return error.apiMessage;
    }
    if (error.status >= 500) {
      return '서버 오류로 사진을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    }
  }

  if (error instanceof Error) {
    if (error.message.startsWith('network_error:')) {
      return '네트워크 오류입니다. 연결을 확인한 뒤 다시 시도해 주세요.';
    }
    if (error.message === 'profile_image_permission_denied') {
      return '사진 라이브러리 접근 권한이 필요합니다. 설정에서 허용해 주세요.';
    }
    if (error.message === 'profile_image_pick_failed') {
      return '사진을 선택하지 못했습니다. 다시 시도해 주세요.';
    }
    if (error.message === 'profile_image_native_module_missing') {
      return '사진 선택 기능을 사용하려면 최신 DEV 앱을 설치해야 합니다. 앱을 업데이트한 뒤 다시 시도해 주세요.';
    }
  }

  return '사진을 업로드하지 못했습니다. 다시 시도해 주세요.';
}
