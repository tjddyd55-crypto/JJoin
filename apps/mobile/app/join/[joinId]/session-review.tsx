import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Button, FormScreenFrame, Stack, Text, useTheme } from '@jjoin/design-system';
import { JOIN_SESSION_REVIEW_PHOTO_MAX } from '@jjoin/domain';
import type { JoinSessionReviewDto } from '@jjoin/types';
import { getApiClient, resolveApiBaseUrl } from '../../../src/lib/api';
import { getSecureSessionStore } from '../../../src/session/SessionContext';

export default function JoinSessionReviewScreen() {
  const { joinId } = useLocalSearchParams<{ joinId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [review, setReview] = useState<JoinSessionReviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!joinId) return;
    setLoading(true);
    try {
      const mine = await api.getMyJoinSessionReview(joinId);
      if (mine) {
        setReview(mine);
        setTitle(mine.title);
        setContent(mine.content);
      }
    } finally {
      setLoading(false);
    }
  }, [api, joinId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!joinId) return;
    setSaving(true);
    try {
      const saved = await api.upsertJoinSessionReview(joinId, { title, content });
      setReview(saved);
      Alert.alert('저장됨', '쪼인 후기가 저장되었습니다.');
    } catch {
      Alert.alert('저장 실패', '후기를 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const pickPhoto = async () => {
    if (!joinId || !review) {
      Alert.alert('후기 먼저 저장', '제목과 내용을 저장한 뒤 사진을 추가할 수 있습니다.');
      return;
    }
    if (review.photos.length >= JOIN_SESSION_REVIEW_PHOTO_MAX) {
      Alert.alert('사진 제한', `최대 ${JOIN_SESSION_REVIEW_PHOTO_MAX}장까지 추가할 수 있습니다.`);
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets[0]?.uri) return;
    // Photo upload endpoint expects multipart — use fetch directly.
    const tokenStore = getSecureSessionStore();
    const token = await tokenStore.getToken();
    const base = resolveApiBaseUrl();
    const form = new FormData();
    form.append('file', {
      uri: picked.assets[0].uri,
      name: 'review.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
    const res = await fetch(`${base}/joins/${joinId}/session-reviews/me/photos`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      Alert.alert('업로드 실패', '사진을 올리지 못했습니다.');
      return;
    }
    setReview((await res.json()) as JoinSessionReviewDto);
  };

  if (loading) {
    return (
      <FormScreenFrame>
        <Text variant="sectionTitle">{review ? '내 쪼인 후기' : '쪼인 후기 작성'}</Text>
        <Text tone="secondary">불러오는 중…</Text>
      </FormScreenFrame>
    );
  }

  return (
    <FormScreenFrame>
      <Stack gap="md">
        <Text variant="sectionTitle">{review ? '내 쪼인 후기' : '쪼인 후기 작성'}</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="제목"
          maxLength={60}
          style={[styles.input, { borderColor: theme.colors.border.subtle, color: theme.colors.text.primary }]}
        />
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="내용"
          multiline
          maxLength={2000}
          style={[
            styles.textarea,
            { borderColor: theme.colors.border.subtle, color: theme.colors.text.primary },
          ]}
        />
        <Button label={saving ? '저장 중…' : '저장'} onPress={() => void save()} disabled={saving} />
        <Button label="사진 추가" variant="secondary" onPress={() => void pickPhoto()} />
        <View style={styles.photoRow}>
          {review?.photos.map((photo) => (
            <Image key={photo.photoId} source={{ uri: photo.imageUrl }} style={styles.thumb} />
          ))}
        </View>
        {review ? (
          <Stack gap="sm">
            <Button
              label="후기 삭제"
              variant="secondary"
              onPress={() => {
                Alert.alert('후기 삭제', '작성한 후기를 삭제할까요?', [
                  { text: '취소', style: 'cancel' },
                  {
                    text: '삭제',
                    style: 'destructive',
                    onPress: () => {
                      void (async () => {
                        if (!joinId || !review) return;
                        try {
                          await api.deleteMyJoinSessionReview(joinId, review.reviewId);
                          router.back();
                        } catch {
                          Alert.alert('삭제 실패', '후기를 삭제하지 못했습니다.');
                        }
                      })();
                    },
                  },
                ]);
              }}
            />
            <Pressable onPress={() => router.back()}>
              <Text tone="secondary">닫기</Text>
            </Pressable>
          </Stack>
        ) : null}
      </Stack>
    </FormScreenFrame>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 140,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: 8 },
});
