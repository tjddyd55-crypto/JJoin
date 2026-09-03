import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Text, spacing, useTheme } from '@jjoin/design-system';
import {
  clubActivityRegionChipLabel,
  clubActivityRegionKey,
  listRegionExploreNodes,
  listTopLevelSido,
  normalizeClubActivityRegionInput,
  regionExploreHasChildren,
  type ClubActivityRegionDtoShape,
} from '@jjoin/domain';

type RegionView =
  | { kind: 'sido' }
  | { kind: 'sigungu'; sido: string; title: string }
  | { kind: 'gu'; sido: string; parentSigungu: string; title: string };

type Props = {
  value: ClubActivityRegionDtoShape[];
  onChange: (next: ClubActivityRegionDtoShape[]) => void;
  minCount?: number;
};

export function ClubActivityRegionPicker({ value, onChange, minCount = 1 }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [viewStack, setViewStack] = useState<RegionView[]>([{ kind: 'sido' }]);

  const current = viewStack[viewStack.length - 1]!;

  const resetPicker = useCallback(() => {
    setViewStack([{ kind: 'sido' }]);
  }, []);

  const removeRegion = useCallback(
    (region: ClubActivityRegionDtoShape) => {
      const key = clubActivityRegionKey(region.sido, region.sigungu);
      onChange(value.filter((r) => clubActivityRegionKey(r.sido, r.sigungu) !== key));
    },
    [onChange, value],
  );

  const addRegion = useCallback(
    (input: { sido: string; sigungu: string; parentSigungu?: string | null }) => {
      const normalized = normalizeClubActivityRegionInput(input);
      const key = clubActivityRegionKey(normalized.sido, normalized.sigungu);
      if (value.some((r) => clubActivityRegionKey(r.sido, r.sigungu) === key)) {
        return;
      }
      onChange([...value, normalized]);
      setOpen(false);
      resetPicker();
    },
    [onChange, resetPicker, value],
  );

  const popView = () => {
    setViewStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };

  const regionNodes = useMemo(() => {
    if (current.kind === 'sigungu') {
      return listRegionExploreNodes(current.sido);
    }
    if (current.kind === 'gu') {
      return listRegionExploreNodes(current.sido, current.parentSigungu);
    }
    return [];
  }, [current]);

  const headerTitle =
    current.kind === 'sido'
      ? '활동 지역 선택'
      : current.kind === 'gu'
        ? current.title
        : current.title;

  return (
    <View style={styles.block}>
      <View style={styles.chips}>
        {value.map((region) => (
          <Chip
            key={clubActivityRegionKey(region.sido, region.sigungu)}
            label={clubActivityRegionChipLabel(region)}
            selected
            onPress={() => removeRegion(region)}
          />
        ))}
      </View>
      {value.length < minCount ? (
        <Text variant="caption" tone="tertiary">
          활동 지역을 {minCount}개 이상 선택해 주세요.
        </Text>
      ) : null}
      <Button label="지역 추가" variant="secondary" size="sm" onPress={() => setOpen(true)} />

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
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
          <View style={styles.sheetHeader}>
            {viewStack.length > 1 ? (
              <Pressable onPress={popView} hitSlop={8}>
                <Text variant="meta" tone="secondary">{'\u2039'}</Text>
              </Pressable>
            ) : null}
            <Text variant="sectionTitle">{headerTitle}</Text>
          </View>
          <ScrollView style={styles.list}>
            {current.kind === 'sido'
              ? listTopLevelSido().map((item) => (
                  <Pressable
                    key={item.sido}
                    style={styles.row}
                    onPress={() => setViewStack([{ kind: 'sigungu', sido: item.sido, title: item.label }])}
                  >
                    <Text variant="body">{item.label}</Text>
                  </Pressable>
                ))
              : regionNodes.map((node) => (
                  <Pressable
                    key={`${node.sido}|${node.sigungu}`}
                    style={styles.row}
                    onPress={() => {
                      if (current.kind === 'sigungu' && regionExploreHasChildren(current.sido, node.sigungu)) {
                        setViewStack((prev) => [
                          ...prev,
                          {
                            kind: 'gu',
                            sido: current.sido,
                            parentSigungu: node.sigungu,
                            title: node.label,
                          },
                        ]);
                        return;
                      }
                      const parentSigungu =
                        current.kind === 'gu' ? current.parentSigungu : null;
                      addRegion({
                        sido: node.sido,
                        sigungu: node.sigungu,
                        parentSigungu,
                      });
                    }}
                  >
                    <Text variant="body">{node.label}</Text>
                  </Pressable>
                ))}
          </ScrollView>
          <Button label="닫기" variant="secondary" onPress={() => setOpen(false)} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { maxHeight: '70%', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  list: { maxHeight: 360 },
  row: { paddingVertical: spacing.sm },
});
