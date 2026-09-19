import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Button, Card, Text, spacing, useTheme } from '@jjoin/design-system';
import type { ApiClient } from '@jjoin/api-client';
import type { FieldGolfCourseDto } from '@jjoin/types';
import {
  formatFieldCourseRegionLabel,
  formatFieldCourseShortAddress,
} from '@jjoin/domain';
import { FieldRegionPicker } from '../../explore/discovery/components/FieldRegionPicker';
import {
  type JoinCreateVenueSelection,
  venueSelectionHasPlace,
} from '../model/join-create-venue';

type Props = {
  api: ApiClient;
  selected: JoinCreateVenueSelection | null;
  onChange: (next: JoinCreateVenueSelection | null) => void;
};

export function JoinCreateFieldVenueSection({ api, selected, onChange }: Props) {
  const theme = useTheme();
  const [sido, setSido] = useState<string | null>(null);
  const [sigungu, setSigungu] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [hits, setHits] = useState<FieldGolfCourseDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.searchFieldGolfCourses({
        name: name.trim() || undefined,
        sido: sido ?? undefined,
        sigungu: sigungu ?? undefined,
        page: 1,
        perPage: 30,
      });
      setHits(res.items);
      if (res.items.length === 0) {
        setError('조건에 맞는 골프장이 없습니다. 지역이나 이름을 바꿔 보세요.');
      }
    } catch {
      setError('골프장 검색에 실패했습니다.');
      setHits([]);
    } finally {
      setLoading(false);
    }
  }, [api, name, sido, sigungu]);

  useEffect(() => {
    if (!sido || !sigungu) return;
    void search();
  }, [sido, sigungu, search]);

  const selectCourse = useCallback(
    async (course: FieldGolfCourseDto) => {
      setActivatingId(course.id);
      setError(null);
      try {
        const activated = await api.activateFieldGolfCourseVenue(course.id);
        onChange({
          venueId: activated.venueId,
          fieldGolfCourseId: course.id,
          name: course.name,
          address: course.roadAddress ?? course.address ?? '',
          sido: course.sido,
          sigungu: course.sigungu,
          latitude: course.latitude ?? undefined,
          longitude: course.longitude ?? undefined,
          source: 'FIELD_GOLF_COURSE',
        });
      } catch {
        setError('골프장을 조인 장소로 활성화하지 못했습니다.');
      } finally {
        setActivatingId(null);
      }
    },
    [api, onChange],
  );

  return (
    <View style={styles.root}>
      <Text variant="sectionTitle" tone="primary">필드 골프장</Text>
      <Text variant="caption" tone="secondary">
        시/도 → 시/군을 고른 뒤 그 지역의 골프장을 보거나 이름으로 찾으세요.
      </Text>
      {venueSelectionHasPlace(selected) ? (
        <Card>
          <Text variant="bodyStrong" tone="primary">{selected.name}</Text>
          <Text variant="caption" tone="secondary">
            {formatFieldCourseRegionLabel({ sido: selected.sido, sigungu: selected.sigungu }) ||
              selected.address}
          </Text>
          <Button label="다시 선택" variant="secondary" onPress={() => onChange(null)} />
        </Card>
      ) : null}

      <FieldRegionPicker
        province={sido}
        cityCounty={sigungu}
        onSelectProvince={(next) => {
          setSido(next);
          setSigungu(null);
        }}
        onSelectCity={(city) => {
          setSido(city.province);
          setSigungu(city.cityCounty);
        }}
      />

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="골프장 이름"
        style={[
          styles.input,
          {
            borderColor: theme.colors.border.subtle,
            color: theme.colors.text.primary,
          },
        ]}
      />
      <Button label="골프장 검색" onPress={() => void search()} disabled={loading} />
      {loading ? <ActivityIndicator /> : null}
      {error ? <Text variant="caption" tone="error">{error}</Text> : null}
      {hits.map((course) => (
        <Pressable
          key={course.id}
          onPress={() => void selectCourse(course)}
          disabled={activatingId === course.id}
          style={[styles.hit, { borderColor: theme.colors.border.subtle }]}
        >
          <Text variant="bodyStrong" tone="primary">{course.name}</Text>
          <Text variant="caption" tone="secondary">
            {[
              formatFieldCourseRegionLabel({ sido: course.sido, sigungu: course.sigungu }),
              formatFieldCourseShortAddress(course.roadAddress ?? course.address),
            ]
              .filter(Boolean)
              .join(' · ') || '지역 정보 없음'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  hit: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
});
