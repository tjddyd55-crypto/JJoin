import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Chip, Section, Spacer, Text } from '@jjoin/design-system';
import { formatPlayFormatLabel, formatTeamCapacityLabel } from '@jjoin/domain';
import type { JoinDetailDto } from '@jjoin/types';
import { ParticipationStatus } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';

type Props = {
  detail: JoinDetailDto;
  isHost: boolean;
  onUpdated: (next: JoinDetailDto) => void;
};

export function JoinTeamAssignmentSection({ detail, isHost, onUpdated }: Props) {
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const teamCount = detail.teamCount ?? 0;
  const playFormat = detail.playFormat ?? 'INDIVIDUAL';
  if (playFormat !== 'TEAM' || teamCount < 2) return null;

  const assignable = detail.participants.filter(
    (p) =>
      p.participationStatus === ParticipationStatus.CONFIRMED ||
      p.participationStatus === ParticipationStatus.COMPLETED,
  );

  async function assign(participantId: string, teamIndex: number | null) {
    setBusyId(participantId);
    setError(null);
    try {
      const next = await api.assignJoinTeam(detail.joinId, { participantId, teamIndex });
      onUpdated(next);
    } catch {
      setError('팀 배정에 실패했습니다.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Section
      title={`팀 배정 · ${formatPlayFormatLabel('TEAM')}`}
      subtitle={formatTeamCapacityLabel({ teamSize: detail.teamSize ?? null, teamCount }) ?? undefined}
    >
      {assignable.length === 0 ? (
        <Text variant="body" tone="secondary">아직 확정된 참가자가 없습니다.</Text>
      ) : (
        assignable.map((row) => (
          <Card key={row.participantId} variant="base" padding="md">
            <Text variant="bodyStrong">
              {row.nickname}
              {row.teamIndex == null ? '' : ` · ${row.teamIndex + 1}팀`}
            </Text>
            {isHost ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {Array.from({ length: teamCount }, (_, index) => (
                  <Chip
                    key={`${row.participantId}-${index}`}
                    label={`${index + 1}팀`}
                    selected={row.teamIndex === index}
                    onPress={() => void assign(row.participantId, index)}
                  />
                ))}
                <Button
                  label="해제"
                  variant="ghost"
                  loading={busyId === row.participantId}
                  onPress={() => void assign(row.participantId, null)}
                />
              </View>
            ) : (
              <Text variant="caption" tone="secondary">
                {row.teamIndex == null ? '아직 팀이 정해지지 않았습니다' : `${row.teamIndex + 1}팀`}
              </Text>
            )}
          </Card>
        ))
      )}
      {error ? (
        <>
          <Spacer size="sm" />
          <Text tone="error">{error}</Text>
        </>
      ) : null}
    </Section>
  );
}
