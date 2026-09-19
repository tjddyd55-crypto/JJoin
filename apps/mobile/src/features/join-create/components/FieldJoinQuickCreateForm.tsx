import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Chip, Input, Text, spacing } from '@jjoin/design-system';
import { FIELD_ALLOWED_RECRUIT_COUNTS } from '@jjoin/domain';
import type { ApiClient } from '@jjoin/api-client';
import { RewardCoinInput } from '../../../ui/patterns/RewardCoinInput';
import { KstDatePickerField } from '../../../shared/date/KstDatePickerField';
import { KstTimePickerField } from '../../../shared/date/KstTimePickerField';
import { JoinCreateFieldVenueSection } from './JoinCreateFieldVenueSection';
import { FieldJoinCreateCostSection } from './FieldJoinCreateCostSection';
import { FieldJoinBenefitsSection } from './FieldJoinBenefitsSection';
import { JoinCreateGenderCompositionSection } from './JoinCreateGenderCompositionSection';
import { JoinCreateMemberPreferencesSection } from './JoinCreateMemberPreferencesSection';
import type { JoinCreateVenueSelection } from '../model/join-create-venue';
import type { FieldJoinCreateCostState } from '../model/field-join-create-cost';
import type { JoinGenderCompositionState } from '../model/join-create-gender-composition';
import type { JoinMemberPreferencesState } from './JoinCreateMemberPreferencesSection';

type Props = {
  api: ApiClient;
  selectedVenue: JoinCreateVenueSelection | null;
  onChangeVenue: (next: JoinCreateVenueSelection | null) => void;
  gameDate: string;
  onChangeDate: (next: string) => void;
  startTime: string;
  onChangeTime: (next: string) => void;
  startAtValid: boolean;
  venueReady: boolean;
  recruitCount: number;
  onChangeRecruit: (recruitCount: 1 | 2 | 3) => void;
  fieldCost: FieldJoinCreateCostState;
  onChangeCost: (next: FieldJoinCreateCostState) => void;
  genderComposition: JoinGenderCompositionState;
  onChangeGender: (next: JoinGenderCompositionState) => void;
  memberPrefs: JoinMemberPreferencesState;
  onChangeMemberPrefs: (next: JoinMemberPreferencesState) => void;
  coinSelected: boolean;
  onChangeCoinSelected: (next: boolean) => void;
  rewardPerParticipant: string;
  onChangeReward: (next: string) => void;
  rewardEligibleSlots: number;
  description: string;
  onChangeDescription: (next: string) => void;
};

export function FieldJoinQuickCreateForm(props: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <View style={styles.root}>
      <Text variant="caption" tone="secondary">
        골프장·날짜·티타임·그린피·모집만 있으면 바로 만들 수 있습니다.
      </Text>
      <JoinCreateFieldVenueSection
        api={props.api}
        selected={props.selectedVenue}
        onChange={props.onChangeVenue}
      />
      <KstDatePickerField label="날짜" dateYmd={props.gameDate} onChange={props.onChangeDate} />
      <KstTimePickerField
        label="티타임"
        valueHm={props.startTime}
        onChange={props.onChangeTime}
      />
      {!props.startAtValid && props.venueReady ? (
        <Text variant="caption" tone="error">티타임은 현재보다 이후여야 합니다.</Text>
      ) : null}
      <FieldJoinCreateCostSection value={props.fieldCost} onChange={props.onChangeCost} />
      <View style={styles.block}>
        <Text variant="sectionTitle" tone="primary">몇 명을 모집하시나요?</Text>
        <Text variant="caption" tone="secondary">방장은 별도입니다. 최종 인원은 최대 4명입니다.</Text>
        <View style={styles.row}>
          {FIELD_ALLOWED_RECRUIT_COUNTS.map((n) => (
            <Chip
              key={n}
              label={`${n}명`}
              selected={props.recruitCount === n}
              onPress={() => props.onChangeRecruit(n)}
            />
          ))}
        </View>
      </View>
      <Pressable
        onPress={() => setAdvancedOpen((open) => !open)}
        accessibilityRole="button"
        style={styles.advancedToggle}
      >
        <Text variant="bodyStrong" tone="primary">
          {advancedOpen ? '조건 접기' : '조건 더보기'}
        </Text>
        <Text variant="caption" tone="secondary">
          성별 · 나이 · 혜택 · 코인 · 메모 · 기본값 무관/없음
        </Text>
      </Pressable>
      {advancedOpen ? <FieldJoinQuickCreateAdvanced {...props} /> : null}
    </View>
  );
}

function FieldJoinQuickCreateAdvanced(props: Props) {
  return (
    <View style={styles.advanced}>
      <JoinCreateGenderCompositionSection
        totalCapacity={props.recruitCount}
        value={props.genderComposition}
        hostGender={null}
        caption="모집 인원만 지정합니다. 신청은 막지 않고 확정 때 적용됩니다."
        specifyLabel="구성 지정"
        onChange={props.onChangeGender}
      />
      <JoinCreateMemberPreferencesSection
        value={props.memberPrefs}
        onChange={props.onChangeMemberPrefs}
        ageChoice="chips"
      />
      <FieldJoinBenefitsSection
        value={{
          benefitGreenFee: props.fieldCost.benefitGreenFee,
          benefitCart: props.fieldCost.benefitCart,
          benefitCaddie: props.fieldCost.benefitCaddie,
        }}
        coinSelected={props.coinSelected}
        onChange={(next) =>
          props.onChangeCost({
            ...props.fieldCost,
            benefitGreenFee: next.benefitGreenFee,
            benefitCart: next.benefitCart,
            benefitCaddie: next.benefitCaddie,
          })
        }
        onCoinChange={props.onChangeCoinSelected}
      />
      {props.coinSelected ? (
        <RewardCoinInput
          onChange={props.onChangeReward}
          rewardEligibleSlots={props.rewardEligibleSlots}
          value={props.rewardPerParticipant}
        />
      ) : null}
      <Input
        label="방장 메모 (선택)"
        value={props.description}
        onChangeText={props.onChangeDescription}
        placeholder="참가자에게 전할 한마디"
        multiline
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  block: { gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  advancedToggle: { gap: 4, paddingVertical: 8 },
  advanced: { gap: spacing.md },
});
