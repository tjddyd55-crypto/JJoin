import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button, Card, ScrollScreenFrame, Stack, Text, spacing, useTheme } from '@jjoin/design-system';
import type { ClubNoticeDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

export function ClubNoticesScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [items, setItems] = useState<ClubNoticeDto[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const load = useCallback(async () => {
    if (!clubId) return;
    setItems((await api.listClubNotices(clubId)).items);
  }, [api, clubId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const inputStyle = {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderColor: theme.colors.border.subtle,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.surface.card,
  };

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Stack gap="md">
        <Text variant="screenTitle">공지</Text>
        {items.map((notice) => (
          <Card key={notice.id} padding="md">
            <Stack gap="xs">
              <Text variant="bodyStrong">
                {notice.pinned ? '📌 ' : ''}
                {notice.title}
              </Text>
              <Text tone="secondary">{notice.body}</Text>
            </Stack>
          </Card>
        ))}

        <Text variant="sectionTitle">공지 작성</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="제목" style={inputStyle} />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="내용"
          multiline
          style={[inputStyle, styles.bodyInput]}
        />
        <Button
          label="공지 등록"
          size="sm"
          onPress={() =>
            void api
              .createClubNotice(clubId!, { title, body, pinned: false, sendPush: true })
              .then(() => {
                setTitle('');
                setBody('');
                return load();
              })
          }
        />
      </Stack>
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  bodyInput: { minHeight: 100, textAlignVertical: 'top' },
});
