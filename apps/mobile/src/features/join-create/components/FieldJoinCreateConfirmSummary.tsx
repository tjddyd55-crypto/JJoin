import { Card } from '@jjoin/design-system';
import {
  formatFieldGreenFeeLabel,
  formatFieldRecruitSummary,
  formatFieldRoundHolesLabel,
  formatFieldSelectedBenefitsLabel,
  plannedPlayerCountToRecruitCount,
} from '@jjoin/domain';
import { JoinCreateSummaryRow } from './JoinCreateStepHeader';
import type { FieldJoinCreateCostState } from '../model/field-join-create-cost';

type Props = {
  venueLabel: string;
  scheduleLabel: string;
  players: number;
  cost: FieldJoinCreateCostState;
  memberLabel: string;
  skillLabel: string;
  genderLabel: string;
  rewardLabel: string;
  onPressVenue: () => void;
  onPressCapacity: () => void;
  onPressCost: () => void;
  onPressBenefits: () => void;
  onPressOptions: () => void;
};

export function FieldJoinCreateConfirmSummary({
  venueLabel,
  scheduleLabel,
  players,
  cost,
  memberLabel,
  skillLabel,
  genderLabel,
  rewardLabel,
  onPressVenue,
  onPressCapacity,
  onPressCost,
  onPressBenefits,
  onPressOptions,
}: Props) {
  const recruitCount = plannedPlayerCountToRecruitCount(players);
  const benefits = formatFieldSelectedBenefitsLabel({
    benefits: {
      benefitGreenFee: cost.benefitGreenFee,
      benefitCart: cost.benefitCart,
      benefitCaddie: cost.benefitCaddie,
    },
    rewardPerParticipant: rewardLabel.includes('없음') ? '0' : rewardLabel,
  });

  return (
    <Card variant="elevated" padding="md">
      <JoinCreateSummaryRow label="골프장" value={venueLabel} onPress={onPressVenue} />
      <JoinCreateSummaryRow label="티타임" value={scheduleLabel} onPress={onPressVenue} />
      <JoinCreateSummaryRow
        label="홀"
        value={formatFieldRoundHolesLabel(cost.roundHoles)}
        onPress={onPressVenue}
      />
      <JoinCreateSummaryRow
        label="모집"
        value={formatFieldRecruitSummary({
          recruitCount,
          applicationCount: 0,
          confirmedCount: 0,
        })}
        onPress={onPressCapacity}
      />
      <JoinCreateSummaryRow label="성별" value={genderLabel} onPress={onPressCapacity} />
      <JoinCreateSummaryRow
        label="그린피"
        value={formatFieldGreenFeeLabel(cost.greenFeePerPerson) ?? '미입력'}
        onPress={onPressCost}
      />
      <JoinCreateSummaryRow
        label="혜택"
        value={benefits ?? '없음'}
        onPress={onPressBenefits}
      />
      <JoinCreateSummaryRow label="멤버 조건" value={memberLabel} onPress={onPressCapacity} />
      <JoinCreateSummaryRow label="필드 핸디" value={skillLabel} onPress={onPressCapacity} />
      <JoinCreateSummaryRow label="코인 보상" value={rewardLabel} onPress={onPressOptions} />
    </Card>
  );
}
