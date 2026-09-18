import { Card } from '@jjoin/design-system';
import {
  formatFieldCaddieModeLabel,
  formatFieldExpectedCostLabel,
  formatFieldGreenFeePayerLabel,
  formatFieldOpenSeatsLabel,
  formatFieldRoundHolesLabel,
  formatFieldSplitFeePayerLabel,
  formatPlayFormatLabel,
  formatTeamCapacityLabel,
} from '@jjoin/domain';
import { JoinPlayFormat } from '@jjoin/types';
import { JoinCreateSummaryRow } from './JoinCreateStepHeader';
import type { FieldJoinCreateCostState } from '../model/field-join-create-cost';
import { fieldJoinCostEstimate } from '../model/field-join-create-cost';

type Props = {
  venueLabel: string;
  scheduleLabel: string;
  playFormat: JoinPlayFormat;
  players: number;
  teamSize: number;
  teamCount: number;
  cost: FieldJoinCreateCostState;
  memberLabel: string;
  skillLabel: string;
  joinMethodLabel: string;
  rewardLabel: string;
  onPressVenue: () => void;
  onPressCapacity: () => void;
  onPressCost: () => void;
  onPressMembers: () => void;
  onPressOptions: () => void;
};

export function FieldJoinCreateConfirmSummary({
  venueLabel,
  scheduleLabel,
  playFormat,
  players,
  teamSize,
  teamCount,
  cost,
  memberLabel,
  skillLabel,
  joinMethodLabel,
  rewardLabel,
  onPressVenue,
  onPressCapacity,
  onPressCost,
  onPressMembers,
  onPressOptions,
}: Props) {
  const estimate = fieldJoinCostEstimate(cost, players);
  const formatLabel =
    playFormat === JoinPlayFormat.TEAM
      ? `${formatPlayFormatLabel(playFormat, 'FIELD')} · ${formatTeamCapacityLabel({ teamSize, teamCount }) ?? `${players}명`}`
      : `${formatPlayFormatLabel(playFormat, 'FIELD')} · ${players}명`;

  return (
    <Card variant="elevated" padding="md">
      <JoinCreateSummaryRow label="골프장" value={venueLabel} onPress={onPressVenue} />
      <JoinCreateSummaryRow label="티타임" value={scheduleLabel} onPress={onPressVenue} />
      <JoinCreateSummaryRow
        label="홀"
        value={formatFieldRoundHolesLabel(cost.roundHoles)}
        onPress={onPressVenue}
      />
      <JoinCreateSummaryRow label="형식" value={formatLabel} onPress={onPressCapacity} />
      <JoinCreateSummaryRow
        label="남은 자리"
        value={formatFieldOpenSeatsLabel({ total: players, confirmed: 1, recruiting: players - 1 })}
        onPress={onPressCapacity}
      />
      <JoinCreateSummaryRow
        label="참가자 예상"
        value={formatFieldExpectedCostLabel(estimate.participantExpectedKrw) ?? '미입력'}
        onPress={onPressCost}
      />
      <JoinCreateSummaryRow
        label="그린피"
        value={
          cost.greenFeePerPerson == null
            ? '미입력'
            : `${cost.greenFeePerPerson.toLocaleString('ko-KR')}원 · ${formatFieldGreenFeePayerLabel(cost.greenFeePayer)}`
        }
        onPress={onPressCost}
      />
      <JoinCreateSummaryRow
        label="카트비"
        value={
          cost.cartFeeTotal == null
            ? '미입력'
            : `${cost.cartFeeTotal.toLocaleString('ko-KR')}원 · ${formatFieldSplitFeePayerLabel(cost.cartFeePayer)}`
        }
        onPress={onPressCost}
      />
      <JoinCreateSummaryRow
        label="캐디"
        value={
          cost.caddieMode === 'NO_CADDIE'
            ? formatFieldCaddieModeLabel('NO_CADDIE')
            : `${formatFieldCaddieModeLabel('CADDIE')} · ${
                cost.caddieFeeTotal == null
                  ? '금액 미입력'
                  : `${cost.caddieFeeTotal.toLocaleString('ko-KR')}원 · ${formatFieldSplitFeePayerLabel(cost.caddieFeePayer ?? 'EQUAL_SPLIT')}`
              }`
        }
        onPress={onPressCost}
      />
      <JoinCreateSummaryRow label="멤버 조건" value={memberLabel} onPress={onPressMembers} />
      <JoinCreateSummaryRow label="필드 핸디" value={skillLabel} onPress={onPressMembers} />
      <JoinCreateSummaryRow label="승인 방식" value={joinMethodLabel} onPress={onPressOptions} />
      <JoinCreateSummaryRow label="코인 보상" value={rewardLabel} onPress={onPressOptions} />
    </Card>
  );
}
