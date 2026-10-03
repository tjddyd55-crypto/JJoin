import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Button, FormScreenFrame, Stack, Text, useTheme } from '@jjoin/design-system';
import { JOIN_REVIEW_POST_PHOTO_MAX } from '@jjoin/domain';
import type { JoinReviewPostDetailDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { uploadJoinReviewPostPhoto } from '../upload-join-review-photo';

type ComposeMode = 'create' | 'edit';

type LocalPhoto = { uri: string; pending: true } | { photoId: string; uri: string; pending: false };

export function JoinReviewBoardComposeScreen({ mode }: { mode: ComposeMode }) {
  const { reviewId } = useLocalSearchParams<{ reviewId?: string }>();
  const router = useRouter();
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
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
        setPhotos(
          post.photos.map((p) => ({ photoId: p.photoId, uri: p.imageUrl, pending: false as const })),
        );
      } catch {
        Alert.alert('불러오기 실패', '후기를 불러오지 못했습니다.');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [api, mode, reviewId, router]);

  const pickPhoto = async () => {
    const total = photos.length;
    if (total >= JOIN_REVIEW_POST_PHOTO_MAX) {
      Alert.alert('사진 제한', `최대 ${JOIN_REVIEW_POST_PHOTO_MAX}장까지 추가할 수 있습니다.`);
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets[0]?.uri) return;
    setPhotos((prev) => [...prev, { uri: picked.assets[0].uri, pending: true }]);
  };

  const removePhoto = (index: number) => {
    const target = photos[index];
    if (!target) return;
    if (!target.pending && reviewId) {
      void (async () => {
        try {
          const res = await api.deleteJoinReviewPostPhoto(reviewId, target.photoId);
          setPhotos(
            res.photos.map((p) => ({ photoId: p.photoId, uri: p.imageUrl, pending: false as const })),
          );
        } catch {
          Alert.alert('삭제 실패', '사진을 삭제하지 못했습니다.');
        }
      })();
      return;
    }
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      let post: JoinReviewPostDetailDto;
      if (mode === 'create') {
        post = await api.createJoinReviewPost({ title, content });
      } else if (reviewId) {
        post = await api.updateJoinReviewPost(reviewId, { title, content });
      } else {
        return;
      }

      const pendingUris = photos.filter((p) => p.pending).map((p) => p.uri);
      for (const uri of pendingUris) {
        post = await uploadJoinReviewPostPhoto(post.reviewId, uri);
      }

      router.replace(`/reviews/${post.reviewId}` as Href);
    } catch {
      Alert.alert('등록 실패', '후기를 저장하지 못했습니다.');
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
        <Text variant="caption" tone="secondary">사진</Text>
        <Button label="사진 추가" variant="secondary" onPress={() => void pickPhoto()} />
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
