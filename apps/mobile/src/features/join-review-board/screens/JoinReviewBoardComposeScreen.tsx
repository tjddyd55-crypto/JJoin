import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Button, FormScreenFrame, Stack, Text, useTheme } from '@jjoin/design-system';
import { JOIN_REVIEW_POST_PHOTO_MAX } from '@jjoin/domain';
import type { JoinReviewPostDetailDto } from '@jjoin/types';
import { isApiRequestError } from '@jjoin/api-client';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import {
  createPendingReviewPhoto,
  pendingPhotosToUpload,
  uploadPendingReviewPhotosSequential,
  type PendingReviewPhoto,
} from '../join-review-compose-upload';
import { pickJoinReviewPhotosFromLibrary } from '../pick-join-review-photos';
import { ReviewPhotoPrepError } from '../prepare-review-photo-upload';
import type { PickedProfileImage } from '../../profile/profile-image-upload-payload';

type ComposeMode = 'create' | 'edit';

type LocalPhoto =
  | { uri: string; pending: true; picked: PickedProfileImage; uploaded: boolean }
  | { photoId: string; uri: string; pending: false };

export function JoinReviewBoardComposeScreen({ mode }: { mode: ComposeMode }) {
  const { reviewId } = useLocalSearchParams<{ reviewId?: string }>();
  const router = useRouter();
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const createdPostRef = useRef<JoinReviewPostDetailDto | null>(null);
  const pendingUploadRef = useRef<PendingReviewPhoto[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [loading, setLoading] = useState(mode === 'edit');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode !== 'edit' || !reviewId) return;
    void (async () => {
      setLoading(true);
      try {
        const post = await api.getJoinReviewPost(reviewId);
        if (!post.isMine) {
          Alert.alert('권한 없음', '본인 후기만 수정할 수 있습니다.');
          router.back();
          return;
        }
        setTitle(post.title);
        setContent(post.content);
        syncServerPhotos(post);
      } catch {
        Alert.alert('불러오기 실패', '후기를 불러오지 못했습니다.');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [api, mode, reviewId, router]);

  const syncServerPhotos = (post: JoinReviewPostDetailDto) => {
    setPhotos((prev) => {
      const server: LocalPhoto[] = post.photos.map((p) => ({
        photoId: p.photoId,
        uri: p.imageUrl,
        pending: false as const,
      }));
      const stillPending = prev.filter((p) => p.pending && !p.uploaded);
      return [...server, ...stillPending].slice(0, JOIN_REVIEW_POST_PHOTO_MAX);
    });
  };

  const pickPhoto = async () => {
    if (photos.length >= JOIN_REVIEW_POST_PHOTO_MAX) {
      Alert.alert('사진 제한', `최대 ${JOIN_REVIEW_POST_PHOTO_MAX}장까지 추가할 수 있습니다.`);
      return;
    }
    const picked = await pickJoinReviewPhotosFromLibrary(photos.length);
    if (picked.status === 'permission_denied') {
      Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
      return;
    }
    if (picked.status === 'error') {
      Alert.alert('사진 선택 실패', '사진을 불러오지 못했습니다. 다시 시도해 주세요.');
      return;
    }
    if (picked.status !== 'ok' || picked.images.length === 0) return;

    const nextPending = picked.images.map((image) => ({
      uri: image.uri,
      pending: true as const,
      picked: image,
      uploaded: false,
    }));
    setPhotos((prev) => [...prev, ...nextPending].slice(0, JOIN_REVIEW_POST_PHOTO_MAX));
    pendingUploadRef.current = [
      ...pendingUploadRef.current,
      ...picked.images.map((img) => createPendingReviewPhoto(img)),
    ];
  };

  const removePhoto = (index: number) => {
    const target = photos[index];
    if (!target) return;
    if (!target.pending && reviewId) {
      void (async () => {
        try {
          const res = await api.deleteJoinReviewPostPhoto(reviewId, target.photoId);
          syncServerPhotos(res);
          pendingUploadRef.current = pendingUploadRef.current.filter((p) => p.uploaded);
        } catch {
          Alert.alert('삭제 실패', '사진을 삭제하지 못했습니다.');
        }
      })();
      return;
    }
    if (target.pending) {
      pendingUploadRef.current = pendingUploadRef.current.filter(
        (p) => p.picked.uri !== target.picked.uri || p.uploaded,
      );
    }
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const resolveBodyPost = async (): Promise<JoinReviewPostDetailDto> => {
    if (mode === 'edit' && reviewId) {
      return api.updateJoinReviewPost(reviewId, { title, content });
    }
    if (mode === 'create' && createdPostRef.current) {
      return api.updateJoinReviewPost(createdPostRef.current.reviewId, { title, content });
    }
    const created = await api.createJoinReviewPost({ title, content });
    createdPostRef.current = created;
    return created;
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const post = await resolveBodyPost();
      const queue = pendingPhotosToUpload(pendingUploadRef.current);
      if (queue.length === 0) {
        router.replace(`/reviews/${post.reviewId}` as Href);
        return;
      }

      const uploadResult = await uploadPendingReviewPhotosSequential(api, post.reviewId, queue);
      syncServerPhotos(uploadResult.post);
      pendingUploadRef.current = pendingUploadRef.current.filter((p) => !p.uploaded);

      const { successCount, failCount } = uploadResult;
      if (failCount === 0) {
        router.replace(`/reviews/${uploadResult.post.reviewId}` as Href);
        return;
      }

      if (successCount > 0) {
        Alert.alert(
          '사진 일부 업로드 실패',
          `후기는 저장되었습니다.\n사진 ${successCount + failCount}장 중 ${successCount}장이 업로드되었고 ${failCount}장은 실패했습니다.`,
          [
            {
              text: '사진 다시 올리기',
              onPress: () =>
                router.replace(`/reviews/${uploadResult.post.reviewId}/edit` as Href),
            },
            {
              text: '사진 없이 보기',
              style: 'cancel',
              onPress: () =>
                router.replace(`/reviews/${uploadResult.post.reviewId}` as Href),
            },
          ],
        );
        return;
      }

      Alert.alert(
        '사진 업로드 실패',
        '후기는 저장되었지만 사진 업로드에 실패했습니다. 수정에서 사진을 다시 추가해 주세요.',
        [
          {
            text: '사진 다시 올리기',
            onPress: () =>
              router.replace(`/reviews/${uploadResult.post.reviewId}/edit` as Href),
          },
          {
            text: '사진 없이 보기',
            style: 'cancel',
            onPress: () =>
              router.replace(`/reviews/${uploadResult.post.reviewId}` as Href),
          },
        ],
      );
    } catch (error) {
      if (__DEV__) {
        const detail =
          error instanceof ReviewPhotoPrepError
            ? { code: error.code }
            : isApiRequestError(error)
              ? { status: error.status, code: error.code }
              : { message: error instanceof Error ? error.message : String(error) };
        console.warn('[join-review-photo] submit-failed', detail);
      }
      if (!createdPostRef.current?.reviewId) {
        const message =
          isApiRequestError(error) && error.code
            ? `후기를 저장하지 못했습니다. (${error.code})`
            : '후기를 저장하지 못했습니다.';
        Alert.alert('등록 실패', message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <FormScreenFrame>
        <Text tone="secondary">불러오는 중…</Text>
      </FormScreenFrame>
    );
  }

  return (
    <FormScreenFrame>
      <Stack gap="md">
        <Text variant="sectionTitle">{mode === 'create' ? '쪼인 후기 작성' : '쪼인 후기 수정'}</Text>
        <Text variant="caption" tone="secondary">제목</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="제목을 입력하세요"
          maxLength={60}
          style={[styles.input, { borderColor: theme.colors.border.subtle, color: theme.colors.text.primary }]}
        />
        <Text variant="caption" tone="secondary">내용</Text>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="후기를 자유롭게 작성해 주세요"
          multiline
          maxLength={2000}
          style={[
            styles.textarea,
            { borderColor: theme.colors.border.subtle, color: theme.colors.text.primary },
          ]}
        />
        <Text variant="caption" tone="secondary">
          사진 ({photos.length}/{JOIN_REVIEW_POST_PHOTO_MAX})
        </Text>
        <Button
          label="사진 추가"
          variant="secondary"
          onPress={() => void pickPhoto()}
          disabled={photos.length >= JOIN_REVIEW_POST_PHOTO_MAX}
        />
        <View style={styles.photoRow}>
          {photos.map((photo, index) => (
            <View key={`${photo.uri}-${index}`} style={styles.photoWrap}>
              <Image source={{ uri: photo.uri }} style={styles.thumb} />
              <Pressable style={styles.remove} onPress={() => removePhoto(index)}>
                <Text variant="caption" tone="inverse">×</Text>
              </Pressable>
            </View>
          ))}
        </View>
        <Button
          label={submitting ? (mode === 'create' ? '등록 중…' : '저장 중…') : mode === 'create' ? '등록' : '저장'}
          onPress={() => void submit()}
          disabled={submitting || !title.trim() || !content.trim()}
        />
      </Stack>
    </FormScreenFrame>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textarea: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 160,
    textAlignVertical: 'top',
  },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoWrap: { position: 'relative' },
  thumb: { width: 72, height: 72, borderRadius: 8 },
  remove: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
