import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Card, Section, Spacer, Text, useTheme } from '@jjoin/design-system';
import { FIELD_REGION_CATALOG, shouldSkipFieldSigunguStep } from '@jjoin/domain';
import type {
  FieldNotificationRegionDto,
  NotificationPreferenceDto,
  ScreenNotificationRadiusMode,
} from '@jjoin/types';
import { useModalSafePadding } from '../../../ui/modal-safe-area';
import {
  formatFieldNotificationRegions,
  isFieldRegionSelected,
  listCustomFieldCityChoices,
  toggleFieldNotificationRegion,
} from './join-created-preference-regions';

const RADIUS_OPTIONS: Array<{ mode: ScreenNotificationRadiusMode; label: string }> = [
  { mode: 'KM_5', label: '5km' },
  { mode: 'KM_10', label: '10km' },
  { mode: 'KM_15', label: '15km' },
  { mode: 'KM_30', label: '30km' },
  { mode: 'SAME_ADMIN_REGION', label: '같은 지역' },
];

type Props = {
  prefs: NotificationPreferenceDto;
  busy: boolean;
  onChange: (patch: Partial<NotificationPreferenceDto> & { fieldRegionsResetToAuto?: boolean }) => void;
};

export function JoinCreatedPreferenceSection({ prefs, busy, onChange }: Props) {
  return (
    <>
      <Section title="스크린 조인 알림 거리" subtitle="저장된 위치 기준으로만 계산합니다">
        <Card variant="base" padding="md">
          <View style={styles.chipRow}>
            {RADIUS_OPTIONS.map((option) => (
              <Chip
                key={option.mode}
                label={option.label}
                selected={prefs.screenRadiusMode === option.mode}
                disabled={busy}
                onPress={() => onChange({ screenRadiusMode: option.mode })}
              />
            ))}
          </View>
        </Card>
      </Section>

      <Section title="필드 조인 알림 지역" subtitle="거리 대신 광역/시군 기준으로 받습니다">
        <Card variant="base" padding="md">
          <View style={styles.chipRow}>
            <Chip
              label="자동"
              selected={prefs.fieldRegionMode === 'AUTO'}
              disabled={busy}
              onPress={() => onChange({ fieldRegionsResetToAuto: true })}
            />
            <Chip
              label="직접 선택"
              selected={prefs.fieldRegionMode === 'CUSTOM'}
              disabled={busy}
              onPress={() => onChange({ fieldRegionMode: 'CUSTOM' })}
            />
          </View>
          <Spacer size="sm" />
          <Text variant="meta" tone="tertiary">
            {prefs.fieldRegionMode === 'AUTO'
              ? `집/활동 지역을 따라갑니다: ${formatFieldNotificationRegions(prefs.resolvedFieldRegions)}`
              : '선택한 지역만 유지합니다. 자동으로 되돌리면 집 지역을 다시 따릅니다.'}
          </Text>
          {prefs.fieldRegionMode === 'CUSTOM' ? (
            <CustomFieldRegionPicker
              selected={prefs.fieldRegions}
              disabled={busy}
              onChange={(fieldRegions) => onChange({ fieldRegionMode: 'CUSTOM', fieldRegions })}
            />
          ) : null}
        </Card>
      </Section>
    </>
  );
}

function CustomFieldRegionPicker(props: {
  selected: FieldNotificationRegionDto[];
  disabled: boolean;
  onChange: (regions: FieldNotificationRegionDto[]) => void;
}) {
  const [cityPickerProvince, setCityPickerProvince] = useState<string | null>(null);
  const modalSafePadding = useModalSafePadding();
  const theme = useTheme();
  const cityChoices = cityPickerProvince ? listCustomFieldCityChoices(cityPickerProvince) : [];
  const cityPickerLabel =
    FIELD_REGION_CATALOG.find((group) => group.province === cityPickerProvince)?.label ??
    cityPickerProvince;

  return (
    <View style={styles.customWrap}>
      <Text variant="meta" tone="secondary">
        선택됨: {formatFieldNotificationRegions(props.selected)}
      </Text>
      {FIELD_REGION_CATALOG.map((group) => {
        const skipCity = shouldSkipFieldSigunguStep(group.province);
        const cities = skipCity ? [] : listCustomFieldCityChoices(group.province);
        const provinceSelected = isFieldRegionSelected(props.selected, {
          province: group.province,
          cityCounty: null,
        });
        const selectedCityCount = props.selected.filter(
          (region) => region.province === group.province && region.cityCounty,
        ).length;
        return (
          <View key={group.province} style={styles.provinceBlock}>
            <View style={styles.provinceRow}>
              <Chip
                label={group.label}
                selected={provinceSelected}
                disabled={props.disabled}
                onPress={() =>
                  props.onChange(
                    toggleFieldNotificationRegion(props.selected, {
                      province: group.province,
                      cityCounty: null,
                    }),
                  )
                }
              />
              {cities.length > 0 ? (
                <Chip
                  label={
                    selectedCityCount > 0
                      ? `시/군 ${cities.length}개 · ${selectedCityCount} 선택`
                      : `시/군 ${cities.length}개`
                  }
                  selected={selectedCityCount > 0}
                  disabled={props.disabled}
                  onPress={() => setCityPickerProvince(group.province)}
                />
              ) : null}
            </View>
          </View>
        );
      })}

      <Modal
        visible={cityPickerProvince != null}
        animationType="slide"
        onRequestClose={() => setCityPickerProvince(null)}
      >
        <View
          style={[
            styles.modal,
            {
              backgroundColor: theme.colors.surface.base,
              paddingTop: modalSafePadding.paddingTop + 12,
              paddingBottom: modalSafePadding.paddingBottom + 16,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text variant="sectionTitle" tone="primary">
              {cityPickerLabel} 시/군
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setCityPickerProvince(null)}
              style={styles.modalClose}
            >
              <Text variant="bodyStrong" tone="primary">
                완료
              </Text>
            </Pressable>
          </View>
          <Text variant="meta" tone="tertiary" style={styles.modalHint}>
            광역 전체 선택은 목록에서 시/도 칩으로 합니다. 여기서는 시/군을 여러 개 고를 수 있습니다.
          </Text>
          <ScrollView contentContainerStyle={styles.modalList}>
            <View style={styles.chipRow}>
              {cityChoices.map((city) => (
                <Chip
                  key={city.cityCounty}
                  label={city.label}
                  selected={isFieldRegionSelected(props.selected, {
                    province: city.province,
                    cityCounty: city.cityCounty,
                  })}
                  disabled={props.disabled}
                  onPress={() =>
                    props.onChange(
                      toggleFieldNotificationRegion(props.selected, {
                        province: city.province,
                        cityCounty: city.cityCounty,
                      }),
                    )
                  }
                />
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function Chip(props: { label: string; selected: boolean; disabled: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={props.disabled}
      onPress={props.onPress}
      style={[
        styles.chip,
        {
          borderColor: props.selected ? theme.colors.action.primary : theme.colors.border.subtle,
          backgroundColor: props.selected ? theme.colors.surface.card : theme.colors.surface.base,
        },
      ]}
    >
      <Text variant="caption" tone={props.selected ? 'primary' : 'secondary'}>
        {props.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  customWrap: {
    marginTop: 10,
    gap: 10,
  },
  provinceBlock: {
    gap: 8,
  },
  provinceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  modal: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalClose: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  modalHint: {
    marginBottom: 12,
  },
  modalList: {
    paddingBottom: 24,
  },
});
