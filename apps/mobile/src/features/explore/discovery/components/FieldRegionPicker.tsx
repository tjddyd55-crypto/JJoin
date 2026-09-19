import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, spacing, useTheme } from '@jjoin/design-system';
import {
  FIELD_REGION_CATALOG,
  type FieldCityCounty,
  type FieldProvinceGroup,
} from '@jjoin/domain';

type Props = {
  province: string | null;
  cityCounty: string | null;
  onSelectProvince: (province: string) => void;
  onSelectCity: (city: FieldCityCounty) => void;
};

export function FieldRegionPicker({
  province,
  cityCounty,
  onSelectProvince,
  onSelectCity,
}: Props) {
  const theme = useTheme();
  const [openProvince, setOpenProvince] = useState(province ?? FIELD_REGION_CATALOG[0]?.province ?? null);
  const group: FieldProvinceGroup | undefined = useMemo(
    () => FIELD_REGION_CATALOG.find((g) => g.province === openProvince) ?? FIELD_REGION_CATALOG[0],
    [openProvince],
  );

  return (
    <View style={styles.root}>
      <Text variant="caption" tone="secondary">
        시/도 → 시/군만 고릅니다. 읍·면·동 필터는 없습니다.
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {FIELD_REGION_CATALOG.map((item) => {
          const selected = openProvince === item.province;
          return (
            <Pressable
              key={item.province}
              onPress={() => {
                setOpenProvince(item.province);
                onSelectProvince(item.province);
              }}
              style={[
                styles.chip,
                {
                  borderColor: theme.colors.border.subtle,
                  backgroundColor: selected
                    ? theme.colors.surface.elevated
                    : theme.colors.surface.card,
                },
              ]}
            >
              <Text variant="caption" tone={selected ? 'primary' : 'secondary'}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.wrap}>
        {(group?.cities ?? []).map((city) => {
          const selected = cityCounty === city.cityCounty && province === city.province;
          return (
            <Pressable
              key={`${city.province}-${city.cityCounty}`}
              onPress={() => onSelectCity(city)}
              style={[
                styles.chip,
                {
                  borderColor: theme.colors.border.subtle,
                  backgroundColor: selected
                    ? theme.colors.surface.elevated
                    : theme.colors.surface.card,
                },
              ]}
            >
              <Text variant="caption" tone={selected ? 'primary' : 'secondary'}>
                {city.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  row: { gap: spacing.xs, paddingVertical: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
});
