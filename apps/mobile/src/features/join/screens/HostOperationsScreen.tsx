import { Alert, StyleSheet, View } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  ScrollScreenFrame,
  Section,
  Spacer,
  Stack,
  Text,
} from '@jjoin/design-system';
import {
  calculateParticipationTrust,
  formatCoinWithLabel,
  summarizeStandardHostSettlement,
} from '@jjoin/domain';
import type { JoinDetailDto, JoinParticipantDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore, useSession } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';
import { isStoreMatchingJoin } from '../../store/matching-join-ui';

function participantTrustLabel(participant: JoinParticipantDto): string | null {
  const completed = participant.completedJoinCount ?? 0;
  const noShow = participant.noShowCount ?? 0;
  if (completed + noShow === 0) return null;
  const trust = calculateParticipationTrust({
    joinedCount: completed + noShow,
    attendedCount: completed,
    noShowCount: noShow,
  });
  return trust.labelText;
}

export function HostOperationsScreen() {
  const { joinId } = useLocalSearchParams<{ joinId: string }>();
  const router = useRouter();
  const { me } = useSession();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [detail, setDetail] = useState<JoinDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  const isHost = detail?.host.id === me?.userId;
  const matching = detail ? isStoreMatchingJoin(detail) : false;
  const roster = detail?.participants.filter((p) => p.role !== 'HOST') ?? [];
  const attendanceReady =
    roster.length > 0 && roster.every((p) => typeof attendance[p.participantId] === 'boolean');
  const preview =
    detail && attendanceReady
      ? summarizeStandardHostSettlement({
          rewardPerParticipant: detail.rewardPerParticipant,
          heldTotal: detail.rewardHoldTotalAmount,
          participants: roster.map((p) => ({
            attended: attendance[p.participantId] === true,
          })),
        })
      : null;

  const settlementOpen = detail?.settlement?.settlementOpen ?? false;
  const allSettled =
    detail?.settlement?.settlements.every((s) => !s.canHostPay) ?? false;

  function markAllAttended() {
    const next: Record<string, boolean> = {};
    for (const p of roster) {
      next[p.participantId] = true;
    }
    setAttendance(next);
  }

  function confirmFinalize() {
    if (!joinId || !preview || !attendanceReady) return;
    Alert.alert(
      '정산 확정',
      [
        `참석 ${preview.attendedCount}명 · 노쇼 ${preview.noShowCount}명`,
        '',
        `참석 지급: ${formatCoinWithLabel(preview.payoutTotal)}`,
        `미지급: ${formatCoinWithLabel(preview.unpaidTotal)}`,
        `잔여 HOLD 반환: ${formatCoinWithLabel(preview.refundToHost)}`,
      ].join('\n'),
      [
        { text: '취소', style: 'cancel' },
        {
          text: '정산 확정',
          style: 'default',
          onPress: () => void onFinalize(),
        },
      ],
    );
  }

  async function onFinalize() {
    if (!joinId || busy || !attendanceReady) return;
    setBusy(true);
    setError(null);
    try {
      await api.finalizeHostAttendance(joinId, {
        attendance: roster.map((p) => ({
          participantId: p.participantId,
          attended: attendance[p.participantId] === true,
        })),
      });
      await load();
      router.back();
    } catch {
      setError('정산에 실패했습니다. 참석 상태를 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  if (!detail) {
    return (
      <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
        <Text tone="secondary">{error ?? '불러오는 중…'}</Text>
      </ScrollScreenFrame>
    );
  }

  if (!isHost) {
    return (
      <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
        <Text tone="error">방장만 참석·정산을 관리할 수 있습니다.</Text>
      </ScrollScreenFrame>
    );
  }

  if (matching) {
    return (
      <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
        <Text tone="secondary">
          모집형 조인은 조인 상세 화면에서 참석 확인을 진행해 주세요.
        </Text>
        <Spacer size="md" />
        <Button label="조인 상세로" onPress={() => router.back()} />
      </ScrollScreenFrame>
    );
  }

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Section title="조인 정보">
        <Card variant="elevated" padding="md">
          <Text variant="bodyStrong" tone="primary">
            {detail.title ?? detail.venue.name}
          </Text>
          <Spacer size="xs" />
          <Text variant="caption" tone="secondary">
            종료 예정 {new Date(detail.scheduledEndAt).toLocaleString('ko-KR')}
          </Text>
          <Spacer size="sm" />
          <Text variant="caption" tone="tertiary">
            HOLD {formatCoinWithLabel(detail.rewardHoldTotalAmount)} · 참가 보상{' '}
            {formatCoinWithLabel(detail.rewardPerParticipant)}
          </Text>
          {settlementOpen ? (
            <Badge label="정산 가능" variant="gold" />
          ) : allSettled ? (
            <Badge label="정산 완료" variant="neutral" />
          ) : (
            <Badge label="정산 대기" variant="neutral" />
          )}
        </Card>
      </Section>

      <Section title="참가자">
        <Text variant="caption" tone="tertiary">
          참석한 참가자에게만 코인이 지급됩니다. 미사용 HOLD는 방장에게 반환됩니다.
        </Text>
        <Spacer size="sm" />
        {roster.map((p) => {
          const trust = participantTrustLabel(p);
          return (
            <Card key={p.participantId} variant="base" padding="md" style={styles.participantCard}>
              <Stack gap="xs">
                <Text variant="bodyStrong" tone="primary">
                  {p.nickname}
                </Text>
                {p.attendanceRatePercent != null ? (
                  <Text variant="caption" tone="secondary">
                    참석률 {p.attendanceRatePercent}% · 노쇼 {p.noShowCount ?? 0}
                    {trust ? ` · ${trust}` : ''}
                  </Text>
                ) : trust ? (
                  <Text variant="caption" tone="secondary">{trust}</Text>
                ) : null}
              </Stack>
              {settlementOpen ? (
                <View style={styles.toggleRow}>
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
              ) : (
                <Text variant="caption" tone="tertiary">
                  {p.participationStatus === 'COMPLETED'
                    ? '참석 완료'
                    : p.participationStatus === 'NO_SHOW'
                      ? '노쇼'
                      : '대기'}
                </Text>
              )}
            </Card>
          );
        })}
        {settlementOpen && roster.length > 0 ? (
          <Button
            label="모두 참석"
            variant="secondary"
            onPress={markAllAttended}
          />
        ) : null}
      </Section>

      {preview && settlementOpen ? (
        <Section title="정산 요약">
          <Card variant="elevated" padding="md">
            <Text variant="body" tone="primary">
              참석 {preview.attendedCount}명 · 노쇼 {preview.noShowCount}명
            </Text>
            <Spacer size="sm" />
            <Text variant="caption" tone="secondary">
              참석 지급 {formatCoinWithLabel(preview.payoutTotal)}
            </Text>
            <Text variant="caption" tone="secondary">
              미지급 {formatCoinWithLabel(preview.unpaidTotal)}
            </Text>
            <Text variant="caption" tone="secondary">
              잔여 HOLD 반환 {formatCoinWithLabel(preview.refundToHost)}
            </Text>
          </Card>
          <Spacer size="md" />
          <Button
            label="정산 확정"
            loading={busy}
            disabled={!attendanceReady}
            onPress={confirmFinalize}
          />
        </Section>
      ) : null}

      {error ? (
        <>
          <Spacer size="sm" />
          <Text variant="body" tone="error">{error}</Text>
        </>
      ) : null}
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  participantCard: { marginBottom: 8 },
  toggleRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
});
