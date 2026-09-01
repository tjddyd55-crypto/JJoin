import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';
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
  const [pinned, setPinned] = useState(false);
  const [sendPush, setSendPush] = useState(true);

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
              <Text variant="caption" tone="tertiary">
                {new Date(notice.createdAt).toLocaleString('ko-KR')}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button
                  label={notice.pinned ? '고정 해제' : '고정'}
                  size="sm"
                  variant="secondary"
                  onPress={() =>
                    void api
                      .updateClubNotice(clubId!, notice.id, { pinned: !notice.pinned })
                      .then(load)
                  }
                />
                <Button
                  label="삭제"
                  size="sm"
                  variant="secondary"
                  onPress={() => void api.deleteClubNotice(clubId!, notice.id).then(load)}
                />
              </View>
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
        <View style={styles.row}>
          <Text>고정 공지</Text>
          <Switch value={pinned} onValueChange={setPinned} />
        </View>
        <View style={styles.row}>
          <Text>회원에게 알림 보내기</Text>
          <Switch value={sendPush} onValueChange={setSendPush} />
        </View>
        <Button
          label="공지 등록"
          size="sm"
          onPress={() =>
            void api
              .createClubNotice(clubId!, { title, body, pinned, sendPush })
              .then(() => {
                setTitle('');
                setBody('');
                setPinned(false);
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
