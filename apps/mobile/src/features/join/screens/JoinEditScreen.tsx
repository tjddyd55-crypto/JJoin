import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  FormScreenFrame,
  Stack,
  Text,
  layoutSpacing,
  spacing,
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
import { JoinCreateGenderCompositionSection } from '../../join-create/components/JoinCreateGenderCompositionSection';
import {
  genderCompositionPayload,
  joinGenderCompositionFromDetail,
  resolveHostGenderFromDisplay,
  validateJoinGenderCompositionClient,
  type JoinGenderCompositionState,
} from '../../join-create/model/join-create-gender-composition';
import {
  defaultJoinCreateRoomCharacter,
  joinRoomCharacterFromDetail,
  joinRoomCharacterPayload,
  type JoinCreateRoomCharacterState,
} from '../../join-create/model/join-create-room-character';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore, useSession } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

export function JoinEditScreen() {
  const { joinId } = useLocalSearchParams<{ joinId: string }>();
  const router = useRouter();
  const { me } = useSession();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [plannedPlayerCount, setPlannedPlayerCount] = useState(4);
  const [genderComposition, setGenderComposition] = useState<JoinGenderCompositionState>({
    mode: 'ANY',
    maleCapacity: 2,
  });
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

  const hostGender = resolveHostGenderFromDisplay(me?.publicProfile?.genderDisplay);

  const load = useCallback(async () => {
    if (!joinId) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await api.getJoin(joinId);
      setPlannedPlayerCount(detail.plannedPlayerCount);
      setGenderComposition(joinGenderCompositionFromDetail(detail));
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
    const genderValidation = validateJoinGenderCompositionClient({
      state: genderComposition,
      totalCapacity: plannedPlayerCount,
      hostGender,
    });
    if (!genderValidation.ok) {
      setError(genderValidation.message);
      setSaving(false);
      return;
    }
    try {
      await api.updateJoin(joinId, {
        description: description.trim() || null,
        joinMethod,
        ...memberPreferencesPayload(memberPrefs),
        ...joinRoomCharacterPayload(roomCharacter),
        ...genderCompositionPayload(genderComposition, plannedPlayerCount),
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
    <FormScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Stack gap="md">
        <Text variant="screenTitle">조인 정보 수정</Text>
        <JoinCreateGenderCompositionSection
          totalCapacity={plannedPlayerCount}
          value={genderComposition}
          hostGender={hostGender}
          onChange={setGenderComposition}
        />
        <JoinCreateMemberPreferencesSection value={memberPrefs} onChange={setMemberPrefs} />
        <JoinCreateParticipantSkillSection value={roomCharacter} onChange={setRoomCharacter} />
        <JoinCreateGameAfterSection value={roomCharacter} onChange={setRoomCharacter} />
        {error ? <Text tone="error">{error}</Text> : null}
        <View style={styles.actionSection}>
          <Button label="저장" loading={saving} onPress={() => void onSave()} />
        </View>
      </Stack>
    </FormScreenFrame>
  );
}

const styles = StyleSheet.create({
  actionSection: {
    marginTop: layoutSpacing.sectionGap,
    marginBottom: spacing.sm,
  },
});
