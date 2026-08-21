import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AppText,
  BottomActionBar,
  Button,
  ScreenContainer,
  Stack,
  colors,
  spacing,
} from '@jjoin/design-system';
import { ParticipationStatus, type JoinDetailDto } from '@jjoin/types';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore, useSession } from '../../src/session/SessionContext';

export default function JoinDetailScreen() {
  const { joinId } = useLocalSearchParams<{ joinId: string }>();
  const { me, requestGatedAction } = useSession();
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [detail, setDetail] = useState<JoinDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!joinId) return;
    try {
      const next = await api.getJoin(joinId);
      setDetail(next);
      setError(null);
    } catch {
      setError('조인을 불러오지 못했습니다.');
    }
  }, [api, joinId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isHost = detail?.host.id === me?.userId;
  const pending = detail?.participants.filter(
    (p) => p.participationStatus === ParticipationStatus.APPLIED,
  );

  async function onApply() {
    if (!joinId) return;
    const gate = requestGatedAction({ type: 'APPLY_JOIN', joinId });
    if (!gate.allowed) {
      router.push('/auth/gate');
      return;
    }
    setBusy(true);
    try {
      const next = await api.applyJoin(joinId);
      setDetail(next);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('409') || msg.includes('already')) setError('이미 신청했습니다.');
      else if (msg.includes('403')) setError('호스트는 참가 신청할 수 없습니다.');
      else setError('참가 신청에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function onApprove(participantId: string) {
    if (!joinId) return;
    setBusy(true);
    try {
      const next = await api.approveParticipant(joinId, participantId);
      setDetail(next);
    } catch {
      setError('승인에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  if (!detail) {
    return (
      <ScreenContainer>
        <AppText>{error ?? '불러오는 중…'}</AppText>
        <Button label="뒤로" variant="secondary" onPress={() => router.back()} />
      </ScreenContainer>
    );
  }

  const startLabel = new Date(detail.startAt).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
  });

  return (
    <ScreenContainer>
      <Stack gap="md" style={styles.body}>
        <AppText variant="subtitle">{detail.venue.name}</AppText>
        <AppText variant="body" color="textSecondary">
          {startLabel}
        </AppText>
        <AppText variant="body">
          {detail.confirmedPlayerCount}/{detail.plannedPlayerCount}명 · {detail.status}
        </AppText>
        <AppText variant="body">
          방장 {detail.host.nickname}
          {detail.host.verifiedBadge ? ' · 인증' : ''}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          참가 방식: {detail.joinMethod} · 보상 스냅샷 {detail.rewardPerParticipant} (정산 보류)
        </AppText>

        {detail.myParticipation ? (
          <AppText variant="body">
            내 상태: {detail.myParticipation.participationStatus} (
            {detail.myParticipation.role})
          </AppText>
        ) : null}

        {isHost && pending && pending.length > 0 ? (
          <View style={styles.pending}>
            <AppText variant="body">참가 신청</AppText>
            {pending.map((p) => (
              <View key={p.participantId} style={styles.pendingRow}>
                <AppText variant="body">{p.nickname}</AppText>
                <Button
                  label="승인"
                  loading={busy}
                  onPress={() => void onApprove(p.participantId)}
                />
              </View>
            ))}
          </View>
        ) : null}

        {error ? (
          <AppText variant="body" color="danger">
            {error}
          </AppText>
        ) : null}
      </Stack>

      <BottomActionBar>
        {!isHost && !detail.myParticipation ? (
          <Button label="참가 신청" loading={busy} onPress={() => void onApply()} />
        ) : null}
        <Button label="내 조인" variant="secondary" onPress={() => router.push('/(tabs)/my-joins')} />
        <Button label="닫기" variant="secondary" onPress={() => router.back()} />
      </BottomActionBar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: spacing.lg },
  pending: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
