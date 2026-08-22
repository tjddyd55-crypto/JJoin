import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
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
import {
  ParticipationStatus,
  RewardStatus,
  type JoinDetailDto,
  type SettlementParticipantDto,
  type SettlementIssueType,
} from '@jjoin/types';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore, useSession } from '../../src/session/SessionContext';

function rewardStatusLabel(status: RewardStatus): string {
  switch (status) {
    case RewardStatus.HELD:
      return '보상 예정';
    case RewardStatus.PENDING_CONFIRMATION:
      return '방장 확인 대기';
    case RewardStatus.PAID:
      return '지급 완료';
    case RewardStatus.AUTO_PAID:
      return '자동 지급 완료';
    case RewardStatus.DISPUTED:
      return '문제 확인 중';
    case RewardStatus.REFUNDED:
      return '환불 처리됨';
    case RewardStatus.NOT_ELIGIBLE:
      return '지급 대상 아님';
    default:
      return status;
  }
}

function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function useServerCountdown(initialMs: number | undefined, resetKey: string): number {
  const [ms, setMs] = useState(initialMs ?? 0);
  useEffect(() => {
    setMs(initialMs ?? 0);
  }, [initialMs, resetKey]);
  useEffect(() => {
    if (ms <= 0) return;
    const timer = setInterval(() => setMs((v) => Math.max(0, v - 1000)), 1000);
    return () => clearInterval(timer);
  }, [ms > 0]);
  return ms;
}

function SettlementRowHost(props: {
  row: SettlementParticipantDto;
  busy: boolean;
  onPay: () => void;
  onIssue: (issueType: SettlementIssueType) => void;
}) {
  const countdownMs = useServerCountdown(
    props.row.autoPayCountdownMs,
    `${props.row.settlementId}:${props.row.rewardStatus}`,
  );
  const showCountdown =
    props.row.rewardStatus === RewardStatus.PENDING_CONFIRMATION && countdownMs > 0;

  return (
    <View style={styles.settlementRow}>
      <View style={styles.settlementMeta}>
        <AppText variant="body">{props.row.nickname}</AppText>
        <AppText variant="caption" color="textSecondary">
          {props.row.rewardAmount} Coin · {rewardStatusLabel(props.row.rewardStatus)}
        </AppText>
        {showCountdown ? (
          <AppText variant="caption" color="textSecondary">
            자동 지급까지 {formatCountdown(countdownMs)}
          </AppText>
        ) : null}
      </View>
      {props.row.canHostPay ? (
        <View style={styles.settlementActions}>
          <Button label="보상 지급" loading={props.busy} onPress={props.onPay} />
          <View style={styles.issueRow}>
            <Button
              label="불참"
              variant="secondary"
              loading={props.busy}
              onPress={() => props.onIssue('NO_SHOW')}
            />
            <Button
              label="조퇴"
              variant="secondary"
              loading={props.busy}
              onPress={() => props.onIssue('LEFT_EARLY')}
            />
            <Button
              label="분쟁"
              variant="secondary"
              loading={props.busy}
              onPress={() => props.onIssue('DISPUTE')}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

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

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load();
    });
    return () => sub.remove();
  }, [load]);

  const isHost = detail?.host.id === me?.userId;
  const pending = detail?.participants.filter(
    (p) => p.participationStatus === ParticipationStatus.APPLIED,
  );
  const mySettlement = detail?.settlement?.settlements.find((s) => s.userId === me?.userId);
  const myCountdownMs = useServerCountdown(
    mySettlement?.autoPayCountdownMs,
    `${mySettlement?.settlementId ?? 'none'}:${mySettlement?.rewardStatus ?? 'none'}`,
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

  async function onPay(participantId: string) {
    if (!joinId || busy) return;
    setBusy(true);
    try {
      await api.paySettlementParticipant(joinId, participantId);
      await load();
    } catch {
      setError('보상 지급에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function onIssue(participantId: string, issueType: SettlementIssueType) {
    if (!joinId || busy) return;
    setBusy(true);
    try {
      await api.reportSettlementIssue(joinId, participantId, { issueType });
      await load();
    } catch {
      setError('문제 신고에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function onQaAdvance(mode: 'open' | 'autopay') {
    if (!joinId || !__DEV__) return;
    setBusy(true);
    try {
      await api.qaAdvanceSettlementClock(joinId, mode);
      await load();
    } catch {
      setError('QA 시각 이동에 실패했습니다.');
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
          참가 방식: {detail.joinMethod} · 보상 {detail.rewardPerParticipant} Coin
        </AppText>

        {detail.myParticipation ? (
          <AppText variant="body">
            내 상태: {detail.myParticipation.participationStatus} ({detail.myParticipation.role})
          </AppText>
        ) : null}

        {mySettlement ? (
          <View style={styles.rewardBox}>
            <AppText variant="body">보상 {mySettlement.rewardAmount} Coin</AppText>
            <AppText variant="body">{rewardStatusLabel(mySettlement.rewardStatus)}</AppText>
            {mySettlement.rewardStatus === RewardStatus.PENDING_CONFIRMATION &&
            myCountdownMs > 0 ? (
              <AppText variant="caption" color="textSecondary">
                자동 지급까지 {formatCountdown(myCountdownMs)}
              </AppText>
            ) : null}
          </View>
        ) : null}

        {isHost && detail.settlement?.settlementOpen ? (
          <View style={styles.settlementSection}>
            <AppText variant="body">참가자 정산</AppText>
            {detail.settlement.settlements.map((row) => (
              <SettlementRowHost
                key={row.participantId}
                row={row}
                busy={busy}
                onPay={() => void onPay(row.participantId)}
                onIssue={(issueType) => void onIssue(row.participantId, issueType)}
              />
            ))}
            {detail.settlement.settlements.some((s) => s.canHostPay) ? (
              <Button
                label="모두 정상 참석 · 전체 지급"
                variant="secondary"
                loading={busy}
                onPress={async () => {
                  if (!joinId) return;
                  setBusy(true);
                  try {
                    await api.payAllSettlements(joinId);
                    await load();
                  } catch {
                    setError('전체 지급에 실패했습니다.');
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            ) : null}
          </View>
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

        {__DEV__ && isHost && detail.settlement && !detail.settlement.settlementOpen ? (
          <View style={styles.qaBox}>
            <AppText variant="caption" color="textSecondary">
              DEV QA — 정산 시각 이동
            </AppText>
            <View style={styles.issueRow}>
              <Button
                label="종료(open)"
                variant="secondary"
                loading={busy}
                onPress={() => void onQaAdvance('open')}
              />
              <Button
                label="자동지급(autopay)"
                variant="secondary"
                loading={busy}
                onPress={() => void onQaAdvance('autopay')}
              />
            </View>
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
  rewardBox: {
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  settlementSection: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  settlementRow: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settlementMeta: { gap: spacing.xs },
  settlementActions: { gap: spacing.sm },
  issueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  qaBox: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
});
