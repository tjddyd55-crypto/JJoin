import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Text, Spacer, Stack, spacing, useTheme } from '@jjoin/design-system';
import { ADMIN_SIDO_GROUPS, type AdminDistrict } from '@jjoin/domain';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (district: AdminDistrict) => void;
  onSaveFavorite?: (district: AdminDistrict) => void;
};

export function RegionPickerSheet({
  visible,
  onClose,
  onSelect,
  onSaveFavorite,
}: Props) {
  const theme = useTheme();
  const selectedBorder = theme.colors.state.selectedBorder;
  const [sido, setSido] = useState(ADMIN_SIDO_GROUPS[0]?.sido ?? '서울특별시');
  const group = useMemo(
    () => ADMIN_SIDO_GROUPS.find((g) => g.sido === sido) ?? ADMIN_SIDO_GROUPS[0],
    [sido],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.surface.base,
            borderTopLeftRadius: theme.radius.lg,
            borderTopRightRadius: theme.radius.lg,
          },
        ]}
      >
        <Text variant="sectionTitle" tone="primary">
          지역 선택
        </Text>
        <Text variant="meta" tone="tertiary">
          시/도 선택 후 구/군을 고르세요
        </Text>
        <Spacer size="sm" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sidoRow}
        >
          {ADMIN_SIDO_GROUPS.map((g) => {
            const selected = g.sido === sido;
            return (
              <Pressable
                key={g.sido}
                onPress={() => setSido(g.sido)}
                style={[
                  styles.sidoChip,
                  {
                    borderColor: selected ? selectedBorder : theme.colors.border.subtle,
                    backgroundColor: selected ? theme.colors.state.selectedSurface : 'transparent',
                  },
                ]}
              >
                <Text variant="meta" tone={selected ? 'success' : 'secondary'}>
                  {g.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Spacer size="sm" />
        <ScrollView style={styles.list}>
          <Stack gap="sm">
            {(group?.districts ?? []).map((d) => (
              <View key={`${d.sido}|${d.sigungu}`} style={styles.districtRow}>
                <Pressable
                  style={styles.districtMain}
                  onPress={() => {
                    onSelect(d);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${d.sido} ${d.sigungu}`}
                >
                  <Text variant="body" tone="primary">
                    {d.label}
                  </Text>
                  <Text variant="meta" tone="tertiary">
                    {d.sido}
                  </Text>
                </Pressable>
                {onSaveFavorite ? (
                  <Pressable
                    onPress={() => onSaveFavorite(d)}
                    accessibilityRole="button"
                    accessibilityLabel={`${d.label} 즐겨찾기 저장`}
                    hitSlop={8}
                  >
                    <Text variant="meta" tone="link">
                      저장
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </Stack>
        </ScrollView>
        <Spacer size="md" />
        <Button label="닫기" variant="secondary" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    maxHeight: '70%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sidoRow: {
    gap: spacing.sm,
  },
  sidoChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  list: {
    maxHeight: 320,
  },
  districtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  districtMain: {
    flex: 1,
    gap: 2,
    paddingVertical: spacing.sm,
  },
});
