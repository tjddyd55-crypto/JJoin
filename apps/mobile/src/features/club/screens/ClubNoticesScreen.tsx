import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  Button,
  Card,
  ClubEmptyState,
  ClubSection,
  ClubStatusBadge,
  ScrollScreenFrame,
  Stack,
  Text,
} from '@jjoin/design-system';
import type { ClubNoticeDto } from '@jjoin/types';
import { ClubFormField, ClubFormSection, CLUB_SECTION_GAP } from '../components/ClubFormSection';
import { clubFormStyles, useClubInputStyle } from '../components/club-form-styles';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

export function ClubNoticesScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [items, setItems] = useState<ClubNoticeDto[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [sendPush, setSendPush] = useState(true);
  const inputStyle = useClubInputStyle();

  const load = useCallback(async () => {
    if (!clubId) return;
    setItems((await api.listClubNotices(clubId)).items);
  }, [api, clubId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const pinnedNotices = items.filter((n) => n.pinned);
  const regularNotices = items.filter((n) => !n.pinned);

  const renderNotice = (notice: ClubNoticeDto) => (
    <Card key={notice.id} padding="md">
      <Stack gap="xs">
        <View style={styles.titleRow}>
          <Text variant="bodyStrong" style={styles.title}>{notice.title}</Text>
          {notice.pinned ? <ClubStatusBadge label="중요" tone="active" /> : null}
        </View>
        <Text variant="clubIntro" tone="secondary">{notice.body}</Text>
        <Text variant="clubMeta" tone="tertiary">
          {new Date(notice.createdAt).toLocaleString('ko-KR')}
        </Text>
        <View style={styles.actions}>
          <Button
            label={notice.pinned ? '고정 해제' : '고정'}
            size="sm"
            variant="secondary"
            onPress={() =>
              void api.updateClubNotice(clubId!, notice.id, { pinned: !notice.pinned }).then(load)
            }
          />
          <Button
            label="삭제"
            size="sm"
            variant="danger"
            onPress={() => void api.deleteClubNotice(clubId!, notice.id).then(load)}
          />
        </View>
      </Stack>
    </Card>
  );

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Stack gap="md" style={{ gap: CLUB_SECTION_GAP }}>
        {pinnedNotices.length > 0 ? (
          <ClubSection title="중요 공지">{pinnedNotices.map(renderNotice)}</ClubSection>
        ) : null}

        {regularNotices.length > 0 ? (
          <ClubSection title="일반 공지">{regularNotices.map(renderNotice)}</ClubSection>
        ) : null}

        {items.length === 0 ? (
          <ClubEmptyState title="등록된 공지가 없습니다" description="운영진이 공지를 작성할 수 있습니다." />
        ) : null}

        <ClubFormSection title="공지 작성">
          <ClubFormField label="제목">
            <TextInput value={title} onChangeText={setTitle} placeholder="제목" style={inputStyle} />
          </ClubFormField>
          <ClubFormField label="내용">
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="내용"
              multiline
              style={[inputStyle, clubFormStyles.multiline]}
            />
          </ClubFormField>
          <View style={clubFormStyles.switchRow}>
            <Text variant="bodyStrong">중요 공지로 고정</Text>
            <Switch value={pinned} onValueChange={setPinned} />
          </View>
          <View style={clubFormStyles.switchRow}>
            <Text variant="bodyStrong">회원에게 알림 보내기</Text>
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
        </ClubFormSection>
      </Stack>
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
});
