import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Button,
  FormScreenFrame,
  Stack,
  StickyActionFrame,
  Text,
} from '@jjoin/design-system';
import { JoinMethod } from '@jjoin/types';
import { JoinCreateGameAfterSection } from '../../join-create/components/JoinCreateGameAfterSection';
import {
  JoinCreateMemberPreferencesSection,
  defaultJoinMemberPreferences,
  memberPreferencesPayload,
  type JoinMemberPreferencesState,
} from '../../join-create/components/JoinCreateMemberPreferencesSection';
import { JoinCreateParticipantSkillSection } from '../../join-create/components/JoinCreateParticipantSkillSection';
import {
  defaultJoinCreateRoomCharacter,
  joinRoomCharacterFromDetail,
  joinRoomCharacterPayload,
  type JoinCreateRoomCharacterState,
} from '../../join-create/model/join-create-room-character';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

export function JoinEditScreen() {
  const { joinId } = useLocalSearchParams<{ joinId: string }>();
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [memberPrefs, setMemberPrefs] = useState<JoinMemberPreferencesState>(() =>
    defaultJoinMemberPreferences(),
  );
  const [roomCharacter, setRoomCharacter] = useState<JoinCreateRoomCharacterState>(() =>
    defaultJoinCreateRoomCharacter(),
  );
  const [joinMethod, setJoinMethod] = useState<JoinMethod>(JoinMethod.APPROVAL);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!joinId) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await api.getJoin(joinId);
      setMemberPrefs({
        preferredGender: detail.preferredGender ?? defaultJoinMemberPreferences().preferredGender,
        minAge: detail.minAge ?? null,
        maxAge: detail.maxAge ?? null,
      });
      setRoomCharacter(
        joinRoomCharacterFromDetail({
          participantSkillMode: detail.participantSkillMode,
          minScreenHandicap: detail.minScreenHandicap,
          maxScreenHandicap: detail.maxScreenHandicap,
          gameStyle: detail.gameStyle,
          gameMemo: detail.gameMemo,
          afterPlan: detail.afterPlan,
          afterMemo: detail.afterMemo,
        }),
      );
      setJoinMethod(detail.joinMethod);
      setDescription(detail.description ?? '');
    } catch {
      setError('조인 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [api, joinId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onSave = async () => {
    if (!joinId) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateJoin(joinId, {
        description: description.trim() || null,
        joinMethod,
        ...memberPreferencesPayload(memberPrefs),
        ...joinRoomCharacterPayload(roomCharacter),
      });
      router.back();
    } catch {
      setError('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <FormScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
        <Text tone="secondary">불러오는 중…</Text>
      </FormScreenFrame>
    );
  }

  return (
    <FormScreenFrame
      edges={[...NESTED_SCREEN_EDGES]}
      footer={
        <StickyActionFrame>
          <Button label="저장" loading={saving} onPress={() => void onSave()} />
        </StickyActionFrame>
      }
    >
      <Stack gap="md">
        <Text variant="screenTitle">조인 정보 수정</Text>
        <JoinCreateMemberPreferencesSection value={memberPrefs} onChange={setMemberPrefs} />
        <JoinCreateParticipantSkillSection value={roomCharacter} onChange={setRoomCharacter} />
        <JoinCreateGameAfterSection value={roomCharacter} onChange={setRoomCharacter} />
        {error ? <Text tone="error">{error}</Text> : null}
      </Stack>
    </FormScreenFrame>
  );
}
