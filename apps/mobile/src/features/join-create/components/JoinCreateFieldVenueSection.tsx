import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Button, Card, Text, spacing, useTheme } from '@jjoin/design-system';
import type { ApiClient } from '@jjoin/api-client';
import type { AdminSidoGroupDto, FieldGolfCourseDto } from '@jjoin/types';
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
  const [groups, setGroups] = useState<AdminSidoGroupDto[]>([]);
  const [sido, setSido] = useState<string | null>(null);
  const [sigungu, setSigungu] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [hits, setHits] = useState<FieldGolfCourseDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.getRegionDistricts().then((res) => setGroups(res.groups)).catch(() => setGroups([]));
  }, [api]);

  const districts = useMemo(
    () => groups.find((g) => g.sido === sido)?.districts ?? [],
    [groups, sido],
  );

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
        지역을 고른 뒤 골프장 이름으로 검색하세요. 모바일은 공공데이터 API를 직접 호출하지 않습니다.
      </Text>
      {venueSelectionHasPlace(selected) ? (
        <Card>
          <Text variant="bodyStrong" tone="primary">{selected.name}</Text>
          <Text variant="caption" tone="secondary">
            {[selected.sido, selected.sigungu].filter(Boolean).join(' ') || selected.address}
          </Text>
          <Button label="다시 선택" variant="secondary" onPress={() => onChange(null)} />
        </Card>
      ) : null}

      <View style={styles.chipRow}>
        {groups.map((group) => (
          <Pressable
            key={group.sido}
            onPress={() => {
              setSido(group.sido);
              setSigungu(null);
            }}
            style={[
              styles.chip,
              {
                borderColor: theme.colors.border.subtle,
                backgroundColor:
                  sido === group.sido ? theme.colors.surface.elevated : theme.colors.surface.card,
              },
            ]}
          >
            <Text variant="caption" tone={sido === group.sido ? 'primary' : 'secondary'}>
              {group.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {districts.length > 0 ? (
        <View style={styles.chipRow}>
          {districts.map((district) => (
            <Pressable
              key={`${district.sido}-${district.sigungu}`}
              onPress={() => setSigungu(district.sigungu)}
              style={[
                styles.chip,
                {
                  borderColor: theme.colors.border.subtle,
                  backgroundColor:
                    sigungu === district.sigungu
                      ? theme.colors.surface.elevated
                      : theme.colors.surface.card,
                },
              ]}
            >
              <Text variant="caption" tone={sigungu === district.sigungu ? 'primary' : 'secondary'}>
                {district.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

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
            {course.regionLabel ?? course.address ?? '지역 정보 없음'}
            {course.holeCount ? ` · ${course.holeCount}홀` : ''}
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
