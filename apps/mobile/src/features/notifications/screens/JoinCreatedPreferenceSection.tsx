import { Pressable, StyleSheet, View } from 'react-native';
import { Card, Section, Spacer, Text, useTheme } from '@jjoin/design-system';
import {
  FIELD_REGION_CATALOG,
  listFieldSigunguChoices,
  shouldSkipFieldSigunguStep,
} from '@jjoin/domain';
import type {
  FieldNotificationRegionDto,
  NotificationPreferenceDto,
  ScreenNotificationRadiusMode,
} from '@jjoin/types';

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
  const theme = useTheme();
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
              ? `집/활동 지역을 따라갑니다: ${formatRegions(prefs.resolvedFieldRegions)}`
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

function formatRegions(regions: FieldNotificationRegionDto[]): string {
  if (regions.length === 0) return '아직 집 지역이 없습니다';
  return regions
    .map((region) => (region.cityCounty ? `${region.province} ${region.cityCounty}` : region.province))
    .join(', ');
}

function CustomFieldRegionPicker(props: {
  selected: FieldNotificationRegionDto[];
  disabled: boolean;
  onChange: (regions: FieldNotificationRegionDto[]) => void;
}) {
  return (
    <View style={styles.customWrap}>
      <Text variant="meta" tone="secondary">
        선택됨: {formatRegions(props.selected)}
      </Text>
      {FIELD_REGION_CATALOG.map((group) => {
        const skipCity = shouldSkipFieldSigunguStep(group.province);
        const cities = skipCity ? [] : listFieldSigunguChoices(group.province);
        const provinceSelected = props.selected.some(
          (region) => region.province === group.province && !region.cityCounty,
        );
        return (
          <View key={group.province} style={styles.provinceBlock}>
            <Chip
              label={group.label}
              selected={provinceSelected}
              disabled={props.disabled}
              onPress={() =>
                props.onChange(toggleRegion(props.selected, { province: group.province, cityCounty: null }))
              }
            />
            {cities.length > 0 ? (
              <View style={styles.chipRow}>
                {cities.slice(0, 8).map((city) => (
                  <Chip
                    key={city.cityCounty}
                    label={city.label}
                    selected={props.selected.some(
                      (region) =>
                        region.province === city.province && region.cityCounty === city.cityCounty,
                    )}
                    disabled={props.disabled}
                    onPress={() =>
                      props.onChange(
                        toggleRegion(props.selected, {
                          province: city.province,
                          cityCounty: city.cityCounty,
                        }),
                      )
                    }
                  />
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function toggleRegion(
  current: FieldNotificationRegionDto[],
  target: FieldNotificationRegionDto,
): FieldNotificationRegionDto[] {
  const exists = current.some(
    (region) => region.province === target.province && region.cityCounty === target.cityCounty,
  );
  if (exists) {
    return current.filter(
      (region) => !(region.province === target.province && region.cityCounty === target.cityCounty),
    );
  }
  return [...current, target];
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
});
