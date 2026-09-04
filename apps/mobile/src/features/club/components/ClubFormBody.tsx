import { StyleSheet, TextInput, View } from 'react-native';
import { Chip } from '@jjoin/design-system';
import {
  ClubActivityType,
  ClubAgeGroup,
  ClubJoinMode,
  ClubVisibility,
} from '@jjoin/types';
import type { ClubActivityRegionDtoShape } from '@jjoin/domain';
import { ClubActivityRegionPicker } from './ClubActivityRegionPicker';
import { ClubCoverPicker } from './ClubCoverPicker';
import { ClubFormField, ClubFormSection } from './ClubFormSection';
import { clubFormStyles, useClubInputStyle } from './club-form-styles';

const ACTIVITY_OPTIONS = [
  { value: ClubActivityType.SCREEN, label: '스크린' },
  { value: ClubActivityType.FIELD, label: '필드' },
  { value: ClubActivityType.SCREEN_AND_FIELD, label: '스크린 + 필드' },
] as const;

const AGE_OPTIONS = [
  { value: ClubAgeGroup.TWENTIES, label: '20대' },
  { value: ClubAgeGroup.THIRTIES, label: '30대' },
  { value: ClubAgeGroup.FORTIES, label: '40대' },
  { value: ClubAgeGroup.FIFTIES, label: '50대' },
  { value: ClubAgeGroup.SIXTIES_PLUS, label: '60대+' },
] as const;

export type ClubFormBodyValues = {
  name: string;
  coverImageUrl: string | null;
  intro: string;
  activityRegions: ClubActivityRegionDtoShape[];
  primaryVenueName: string;
  activityType: ClubActivityType;
  primaryAgeGroup: ClubAgeGroup | null;
  joinMode: ClubJoinMode;
  visibility: ClubVisibility;
};

export type ClubFormBodyProps = {
  values: ClubFormBodyValues;
  clubId?: string;
  uploadingCover: boolean;
  onChange: <K extends keyof ClubFormBodyValues>(key: K, value: ClubFormBodyValues[K]) => void;
  onPickCover: (localUri: string) => void;
  onClearCover: () => void;
};

export function ClubFormBody({
  values,
  clubId,
  uploadingCover,
  onChange,
  onPickCover,
  onClearCover,
}: ClubFormBodyProps) {
  const inputStyle = useClubInputStyle();

  return (
    <>
      <ClubFormSection title="대표 이미지" description="선택 사항입니다. 없으면 쪼인존 기본 커버가 표시됩니다.">
        <ClubCoverPicker
          coverImageUrl={values.coverImageUrl}
          uploading={uploadingCover}
          clubId={clubId}
          onPick={onPickCover}
          onClear={onClearCover}
        />
      </ClubFormSection>

      <ClubFormSection title="기본 정보">
        <ClubFormField label="동호회명">
          <TextInput
            value={values.name}
            onChangeText={(text) => onChange('name', text)}
            placeholder="예: 일산 골프 모임"
            style={inputStyle}
          />
        </ClubFormField>
        <ClubFormField label="한 줄 소개">
          <TextInput
            value={values.intro}
            onChangeText={(text) => onChange('intro', text)}
            placeholder="동호회를 한 줄로 소개해 주세요"
            style={inputStyle}
          />
        </ClubFormField>
      </ClubFormSection>

      <ClubFormSection title="활동 정보">
        <ClubFormField label="활동 지역">
          <ClubActivityRegionPicker
            value={values.activityRegions}
            onChange={(regions) => onChange('activityRegions', regions)}
          />
        </ClubFormField>
        <ClubFormField label="활동 유형">
          <View style={clubFormStyles.chips}>
            {ACTIVITY_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={values.activityType === opt.value}
                onPress={() => onChange('activityType', opt.value)}
              />
            ))}
          </View>
        </ClubFormField>
        <ClubFormField label="주 활동 매장 (선택)">
          <TextInput
            value={values.primaryVenueName}
            onChangeText={(text) => onChange('primaryVenueName', text)}
            placeholder="매장명"
            style={inputStyle}
          />
        </ClubFormField>
        <ClubFormField label="주요 연령대">
          <View style={clubFormStyles.chips}>
            {AGE_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={values.primaryAgeGroup === opt.value}
                onPress={() => onChange('primaryAgeGroup', opt.value)}
              />
            ))}
          </View>
        </ClubFormField>
      </ClubFormSection>

      <ClubFormSection title="가입 설정">
        <ClubFormField label="가입 방식">
          <View style={clubFormStyles.chips}>
            <Chip
              label="승인제"
              selected={values.joinMode === ClubJoinMode.APPROVAL}
              onPress={() => onChange('joinMode', ClubJoinMode.APPROVAL)}
            />
            <Chip
              label="바로 가입"
              selected={values.joinMode === ClubJoinMode.INSTANT}
              onPress={() => onChange('joinMode', ClubJoinMode.INSTANT)}
            />
          </View>
        </ClubFormField>
        <ClubFormField label="공개 범위">
          <View style={clubFormStyles.chips}>
            <Chip
              label="공개"
              selected={values.visibility === ClubVisibility.PUBLIC}
              onPress={() => onChange('visibility', ClubVisibility.PUBLIC)}
            />
            <Chip
              label="비공개"
              selected={values.visibility === ClubVisibility.PRIVATE}
              onPress={() => onChange('visibility', ClubVisibility.PRIVATE)}
            />
          </View>
        </ClubFormField>
      </ClubFormSection>
    </>
  );
}
