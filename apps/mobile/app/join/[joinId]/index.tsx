import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, Share, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Text,
  Badge,
  Button,
  Card,
  Icon,
  Input,
  Row,
  ScrollScreenFrame,
  Section,
  StickyActionFrame,
  Stack,
  useTheme,
  type BadgeVariant,
} from '@jjoin/design-system';
import {
  JoinStatus,
  ParticipationStatus,
  RewardStatus,
  type JoinDetailDto,
  type SettlementParticipantDto,
  type SettlementIssueType,
} from '@jjoin/types';
import { getApiClient } from '../../../src/lib/api';
import { getSecureSessionStore, useSession } from '../../../src/session/SessionContext';
import {
  isStoreMatchingJoin,
  matchingCanConfirmAttendance,
  matchingDisplaySubtitle,
  matchingRewardResultLabel,
  matchingSlotProgressLabel,
} from '../../../src/features/store/matching-join-ui';
import {
  canActivateUrgentVacancy,
  summarizeMatchingSettlement,
  formatCoinWithLabel,
} from '@jjoin/domain';
import { isInternalToolsEnabled } from '../../../src/lib/internal-tools';
import { publicJoinShareUrl } from '../../../src/lib/landing-url';
import { reopenJoinHref } from '../../../src/features/engagement/reopen-join';
import {
  attendanceIntentBadgeVariant,
  attendanceIntentLabel,
  canSetAttendanceIntent,
} from '../../../src/features/join/attendance-intent-ui';
import { JoinDetailPrimarySections } from '../../../src/features/join/components/JoinDetailPrimarySections';
import { resolveJoinDetailPrimaryCta } from '../../../src/features/join/join-detail-cta';

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

function rewardBadgeVariant(status: RewardStatus): BadgeVariant {
  switch (status) {
    case RewardStatus.PAID:
    case RewardStatus.AUTO_PAID:
      return 'success';
    case RewardStatus.DISPUTED:
      return 'error';
    case RewardStatus.PENDING_CONFIRMATION:
    case RewardStatus.HELD:
      return 'warning';
    default:
      return 'neutral';
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
    <Card variant="elevated" padding="md">
      <Stack gap="sm">
        <Text variant="bodyStrong" tone="primary">
          {props.row.nickname}
        </Text>
        <Text variant="caption" tone="secondary">
          {formatCoinWithLabel(props.row.rewardAmount)} ·{' '}
          {props.row.dispute?.userFacingMessage ?? rewardStatusLabel(props.row.rewardStatus)}
        </Text>
        <Badge
          label={rewardStatusLabel(props.row.rewardStatus)}
          variant={rewardBadgeVariant(props.row.rewardStatus)}
        />
        {showCountdown ? (
          <Text variant="caption" tone="tertiary">
            자동 지급까지 {formatCountdown(countdownMs)}
          </Text>
        ) : null}
        {props.row.canHostPay ? (
          <Stack gap="sm">
            <Button label="보상 지급" loading={props.busy} onPress={props.onPay} />
            <View style={styles.issueRow}>
              <Button
                label="불참"
                variant="secondary"
                loading={props.busy}
                onPress={() => props.onIssue('NO_SHOW')}
                fullWidth={false}
              />
              <Button
                label="조퇴"
                variant="secondary"
                loading={props.busy}
                onPress={() => props.onIssue('LEFT_EARLY')}
                fullWidth={false}
              />
              <Button
                label="분쟁"
                variant="secondary"
                loading={props.busy}
                onPress={() => props.onIssue('DISPUTE')}
                fullWidth={false}
              />
            </View>
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}

export default function JoinDetailScreen() {
  const { joinId } = useLocalSearchParams<{ joinId: string }>();
  const { me, requestGatedAction } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [detail, setDetail] = useState<JoinDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statement, setStatement] = useState('');
  const [busy, setBusy] = useState(false);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!joinId) return;
    try {
      const next = await api.getJoin(joinId);
      setDetail(next);
      setError(null);
      const initial: Record<string, boolean> = {};
      for (const p of next.participants) {
        if (p.role === 'HOST') continue;
        if (p.participationStatus === 'COMPLETED') initial[p.participantId] = true;
        else if (p.participationStatus === 'NO_SHOW') initial[p.participantId] = false;
      }
      setAttendance(initial);
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

  async function onCancelStoreJoin() {
    if (!joinId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.cancelStoreJoin(joinId);
      setDetail(next);
    } catch {
      setError('조인 취소에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function onLeaveStoreJoin() {
    if (!joinId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.leaveStoreJoin(joinId);
      setDetail(next);
    } catch {
      setError('참가 취소에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function onCompleteMatching() {
    if (!joinId || busy || !detail) return;
    const roster = detail.participants.filter((p) => p.role !== 'HOST');
    for (const p of roster) {
      if (attendance[p.participantId] === undefined) {
        setError('모든 참가자의 참석/노쇼를 선택해주세요.');
        return;
      }
    }
    setBusy(true);
    setError(null);
    try {
      const next = await api.completeStoreJoin(joinId, {
        attendance: roster.map((p) => ({
          participantId: p.participantId,
          attended: attendance[p.participantId] === true,
        })),
      });
      setDetail(next);
    } catch {
      setError('정산에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

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
      else if (msg.includes('GENDER_REQUIRED') || msg.includes('성별')) {
        setError('참가하려면 프로필에서 성별을 설정해주세요.');
      } else setError('참가 신청에 실패했습니다.');
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

  async function onSubmitStatement() {
    const disputeId = mySettlement?.dispute?.disputeId;
    if (!disputeId || !statement.trim() || busy) return;
    setBusy(true);
    try {
      await api.submitDisputeStatement(disputeId, { statement: statement.trim() });
      setStatement('');
      await load();
    } catch {
      setError('설명 제출에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function onQaAdvance(mode: 'open' | 'autopay') {
    if (!joinId || !isInternalToolsEnabled()) return;
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

  async function onToggleBookmark() {
    if (!joinId || !detail || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (detail.bookmarked) {
        await api.unbookmarkJoin(joinId);
        setDetail({ ...detail, bookmarked: false });
      } else {
        await api.bookmarkJoin(joinId);
        setDetail({ ...detail, bookmarked: true });
      }
    } catch {
      setError('찜 처리에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function onShare() {
    if (!detail || !joinId) return;
    setBusy(true);
    setError(null);
    try {
      let slug = detail.shareSlug?.trim() || '';
      if (!slug) {
        const created = await api.ensureJoinShareLink(joinId);
        slug = created.shareSlug?.trim() || '';
        if (slug) {
          setDetail({ ...detail, shareSlug: slug });
        }
      }
      if (!slug) {
        setError('공유 링크를 아직 준비하지 못했습니다.');
        return;
      }
      const url = publicJoinShareUrl(slug);
      const message = `${detail.venue.name} 조인에 함께해요\n${url}`;
      await Share.share({ message, url, title: '쪼인존 조인 공유' });
    } catch {
      setError('공유에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function onReopenJoin() {
    if (!joinId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const prefill = await api.getJoinPrefill(joinId);
      router.push(reopenJoinHref(prefill));
    } catch {
      setError('다시 모집 정보를 불러오지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function onActivateUrgent() {
    if (!joinId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.activateUrgentVacancy(joinId);
      setDetail(next);
    } catch {
      setError('긴급 모집을 시작할 수 없습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function onSetAttendanceIntent(intent: 'CONFIRMED' | 'DECLINED') {
    if (!joinId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.setAttendanceIntent(joinId, { intent });
      setDetail(next);
    } catch {
      setError(
        intent === 'CONFIRMED'
          ? '참석 확정에 실패했습니다.'
          : '참석 의사 변경에 실패했습니다.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (!detail) {
    return (
      <ScrollScreenFrame>
        <Text tone="secondary">{error ?? '불러오는 중…'}</Text>
        <Button label="뒤로" variant="secondary" onPress={() => router.back()} />
      </ScrollScreenFrame>
    );
  }

  const matching = isStoreMatchingJoin(detail);
  const slotLabel = matching
    ? matchingSlotProgressLabel(
        detail.targetMaleCount,
        detail.targetFemaleCount,
        detail.confirmedMaleCount,
        detail.confirmedFemaleCount,
      )
    : null;
  const matchingSubtitle = matching ? matchingDisplaySubtitle(detail) : null;
  const canCancelMatching =
    matching &&
    isHost &&
    (detail.status === JoinStatus.OPEN || detail.status === JoinStatus.FULL) &&
    detail.confirmedPlayerCount <= 1;
  const canLeaveMatching =
    matching &&
    !isHost &&
    Boolean(detail.myParticipation) &&
    (detail.status === JoinStatus.OPEN || detail.status === JoinStatus.FULL);
  const canMarkAttendance =
    matching && isHost && matchingCanConfirmAttendance(detail);
  const matchingRoster = matching
    ? detail.participants.filter((p) => p.role !== 'HOST')
    : [];
  const attendanceReady =
    matchingRoster.length > 0 &&
    matchingRoster.every((p) => typeof attendance[p.participantId] === 'boolean');
  const settlementPreview =
    matching && attendanceReady
      ? summarizeMatchingSettlement({
          rewardPerParticipant: detail.rewardPerParticipant,
          heldTotal: detail.rewardHoldTotalAmount,
          matchingRewardTarget: detail.matchingRewardTarget ?? 'ALL',
          participants: matchingRoster.map((p) => ({
            attended: attendance[p.participantId] === true,
            gender: p.gender ?? null,
          })),
        })
      : null;
  const participantRewardLabel = matching
    ? matchingRewardResultLabel({
        completed: detail.status === JoinStatus.COMPLETED,
        paidAmount:
          mySettlement?.rewardStatus === RewardStatus.PAID ||
          mySettlement?.rewardStatus === RewardStatus.AUTO_PAID
            ? mySettlement.rewardAmount
            : null,
        noshow:
          detail.status === JoinStatus.COMPLETED &&
          mySettlement != null &&
          (mySettlement.rewardStatus === RewardStatus.REFUNDED ||
            mySettlement.rewardStatus === RewardStatus.NOT_ELIGIBLE),
      })
    : null;
  const canReopen =
    isHost &&
    (detail.status === JoinStatus.COMPLETED ||
      detail.status === JoinStatus.CANCELLED ||
      new Date(detail.startAt).getTime() < Date.now());
  const showUrgentActivate =
    isHost &&
    !detail.isUrgent &&
    canActivateUrgentVacancy({
      status: detail.status,
      startAt: detail.startAt,
      plannedPlayerCount: detail.plannedPlayerCount,
      confirmedPlayerCount: detail.confirmedPlayerCount,
    });
  const showAttendanceIntentActions = canSetAttendanceIntent({
    isHost,
    participationStatus: detail.myParticipation?.participationStatus,
  });
  const primaryCta = resolveJoinDetailPrimaryCta({
    detail,
    isHost,
    canLeave: canLeaveMatching,
  });

  return (
    <View style={styles.root}>
      <ScrollScreenFrame style={styles.scroll} contentPaddingBottom={140}>
        <Row justify="flex-end" align="center" gap="sm" style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={detail.bookmarked ? '찜 해제' : '찜하기'}
            onPress={() => void onToggleBookmark()}
            hitSlop={8}
            style={styles.iconHit}
          >
            <Text
              variant="sectionTitle"
              style={{
                color: detail.bookmarked
                  ? theme.colors.action.primary
                  : theme.colors.text.tertiary,
              }}
            >
              {detail.bookmarked ? '♥' : '♡'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="공유"
            onPress={() => void onShare()}
            hitSlop={8}
            style={styles.iconHit}
          >
            <Icon name="share" size="md" tone="secondary" />
          </Pressable>
        </Row>

        {matchingSubtitle ? (
          <Text variant="caption" tone="secondary">
            {matchingSubtitle}
          </Text>
        ) : null}
        {participantRewardLabel ? (
          <Text variant="body" tone="secondary" style={{ color: theme.colors.reward.primary }}>
            {participantRewardLabel}
          </Text>
        ) : null}

        <JoinDetailPrimarySections
          detail={detail}
          isHost={isHost}
          matching={matching}
          slotLabel={slotLabel}
          onOpenHost={() => router.push(`/user/${detail.host.id}`)}
        />

        {mySettlement ? (
          <Section title="내 정산">
            <Card variant="elevated" padding="md">
              <Stack gap="sm">
                <Text variant="bodyStrong" tone="primary">
                  보상 {formatCoinWithLabel(mySettlement.rewardAmount)}
                </Text>
                <Badge
                  label={
                    mySettlement.dispute?.userFacingMessage ??
                    rewardStatusLabel(mySettlement.rewardStatus)
                  }
                  variant={rewardBadgeVariant(mySettlement.rewardStatus)}
                />
                {mySettlement.rewardStatus === RewardStatus.PENDING_CONFIRMATION &&
                myCountdownMs > 0 ? (
                  <Text variant="caption" tone="tertiary">
                    자동 지급까지 {formatCountdown(myCountdownMs)}
                  </Text>
                ) : null}
                {mySettlement.dispute?.canSubmitStatement ? (
                  <Stack gap="sm">
                    <Input
                      label="상황 설명"
                      value={statement}
                      onChangeText={setStatement}
                      multiline
                      maxLength={1000}
                      placeholder="상황 설명을 입력해 주세요"
                    />
                    <Button
                      label="설명 제출"
                      loading={busy}
                      onPress={() => void onSubmitStatement()}
                    />
                  </Stack>
                ) : null}
              </Stack>
            </Card>
          </Section>
        ) : null}

        {isHost && detail.settlement?.settlementOpen ? (
          <Section title="참가자 정산">
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
          </Section>
        ) : null}

        {canMarkAttendance ? (
          <Section title="참석 확인">
            <Text variant="caption" tone="tertiary">
              참석한 보상 대상자에게만 코인이 지급됩니다. 미사용 HOLD는 점주에게 반환됩니다.
            </Text>
            {matchingRoster.map((p) => (
              <Card key={p.participantId} variant="base" padding="md" style={styles.attendanceCard}>
                <Text variant="bodyStrong" tone="primary">
                  {p.nickname}
                </Text>
                <View style={styles.issueRow}>
                  <Button
                    label="참석"
                    variant={attendance[p.participantId] === true ? 'primary' : 'secondary'}
                    fullWidth={false}
                    onPress={() =>
                      setAttendance((prev) => ({ ...prev, [p.participantId]: true }))
                    }
                  />
                  <Button
                    label="노쇼"
                    variant={attendance[p.participantId] === false ? 'primary' : 'secondary'}
                    fullWidth={false}
                    onPress={() =>
                      setAttendance((prev) => ({ ...prev, [p.participantId]: false }))
                    }
                  />
                </View>
              </Card>
            ))}
            {settlementPreview ? (
              <Card variant="elevated" padding="md" style={styles.attendanceCard}>
                <Text variant="bodyStrong" tone="primary">
                  정산 요약
                </Text>
                <Text variant="caption" tone="secondary">
                  보상 지급 예정 {settlementPreview.paidCount}명 · {settlementPreview.payoutTotal}C
                </Text>
                <Text variant="caption" tone="secondary">
                  HOLD 반환 예정 {settlementPreview.refundToHost}C
                </Text>
              </Card>
            ) : (
              <Text variant="caption" tone="tertiary">
                모든 참가자의 참석 여부를 확인해주세요.
              </Text>
            )}
            <Button
              label="참석 확인하기 · 정산 완료"
              loading={busy}
              disabled={!attendanceReady}
              onPress={() => void onCompleteMatching()}
            />
          </Section>
        ) : null}

        {isHost && pending && pending.length > 0 ? (
          <Section title="참가 신청">
            {pending.map((p) => (
              <Card key={p.participantId} variant="base" padding="md">
                <View style={styles.pendingRow}>
                  <Text variant="body" tone="primary">
                    {p.nickname}
                  </Text>
                  <Button
                    label="승인"
                    loading={busy}
                    fullWidth={false}
                    onPress={() => void onApprove(p.participantId)}
                  />
                </View>
              </Card>
            ))}
          </Section>
        ) : null}

        {isInternalToolsEnabled() && isHost && detail.settlement && !detail.settlement.settlementOpen ? (
          <Section title="DEV QA">
            <View style={styles.issueRow}>
              <Button
                label="종료(open)"
                variant="secondary"
                loading={busy}
                fullWidth={false}
                onPress={() => void onQaAdvance('open')}
              />
              <Button
                label="자동지급(autopay)"
                variant="secondary"
                loading={busy}
                fullWidth={false}
                onPress={() => void onQaAdvance('autopay')}
              />
            </View>
          </Section>
        ) : null}

        {error ? (
          <Text variant="body" tone="error">
            {error}
          </Text>
        ) : null}

        {canReopen ? (
          <Section title="모집">
            <Button
              label="다시 모집"
              loading={busy}
              onPress={() => void onReopenJoin()}
            />
          </Section>
        ) : null}

        <View style={styles.secondaryActions}>
          <Button
            label="내 조인"
            variant="secondary"
            onPress={() => router.push('/(tabs)/my-joins')}
          />
          <Button label="닫기" variant="ghost" onPress={() => router.back()} />
        </View>
      </ScrollScreenFrame>

      <StickyActionFrame>
        <Button
          label={primaryCta.label}
          disabled={primaryCta.disabled}
          loading={busy}
          onPress={() => {
            if (primaryCta.label === '참가 신청') void onApply();
            else if (primaryCta.label === '참가 취소') void onLeaveStoreJoin();
          }}
        />
        {detail.status === JoinStatus.COMPLETED ? (
          <Button
            label="함께한 사람 평가하기"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/join/[joinId]/reviews',
                params: { joinId },
              })
            }
          />
        ) : null}
        {showUrgentActivate ? (
          <Button
            label="긴급 모집"
            loading={busy}
            onPress={() => void onActivateUrgent()}
          />
        ) : null}
        {detail.chatAvailable ? (
          <Button
            label="조인 채팅"
            loading={busy}
            onPress={() =>
              router.push({
                pathname: '/join/[joinId]/chat',
                params: { joinId },
              })
            }
          />
        ) : null}
        {isHost ? (
          <Button
            label="참가자 초대"
            variant="secondary"
            loading={busy}
            onPress={() =>
              router.push({
                pathname: '/join/[joinId]/invite',
                params: { joinId },
              })
            }
          />
        ) : null}
        {showAttendanceIntentActions ? (
          <View style={styles.issueRow}>
            <Button
              label="참석합니다"
              variant={
                detail.myParticipation?.attendanceIntent === 'CONFIRMED'
                  ? 'primary'
                  : 'secondary'
              }
              loading={busy}
              fullWidth={false}
              onPress={() => void onSetAttendanceIntent('CONFIRMED')}
            />
            <Button
              label="참석이 어려워요"
              variant={
                detail.myParticipation?.attendanceIntent === 'DECLINED'
                  ? 'primary'
                  : 'secondary'
              }
              loading={busy}
              fullWidth={false}
              onPress={() => void onSetAttendanceIntent('DECLINED')}
            />
          </View>
        ) : null}
        {canCancelMatching ? (
          <Button
            label="모집 조인 취소"
            variant="secondary"
            loading={busy}
            onPress={() => void onCancelStoreJoin()}
          />
        ) : null}
        {canLeaveMatching && primaryCta.label !== '참가 취소' ? (
          <Button
            label="참가 취소"
            variant="secondary"
            loading={busy}
            onPress={() => void onLeaveStoreJoin()}
          />
        ) : null}
      </StickyActionFrame>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  secondaryActions: {
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  headerActions: {
    width: '100%',
  },
  badgeRow: {
    flex: 1,
    flexWrap: 'wrap',
  },
  iconHit: {
    padding: 4,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  issueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attendanceCard: {
    marginTop: 8,
    gap: 8,
  },
  participantName: {
    flex: 1,
  },
});
