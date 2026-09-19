import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Button, IconButton, Text, spacing, useTheme } from '@jjoin/design-system';
import type { ApiClient } from '@jjoin/api-client';
import type { FieldGolfCourseDto } from '@jjoin/types';
import {
  formatFieldCourseLocationLine,
  formatFieldCourseShortAddress,
  listFieldSigunguChoices,
} from '@jjoin/domain';
import { useModalSafePadding } from '../../../ui/modal-safe-area';
import {
  FIELD_COURSE_PICKER_NATIONWIDE_LABEL,
  fieldCoursePickerEmptyHint,
  fieldCoursePickerSearchQuery,
  fieldCoursePickerTitle,
  goBackFieldCoursePicker,
  listFieldCoursePickerSidos,
  selectFieldCoursePickerSido,
  selectFieldCoursePickerSigungu,
  setFieldCoursePickerSearch,
  startNationwideFieldCourseSearch,
  type FieldCoursePickerState,
} from '../model/field-course-picker';
import type { JoinCreateVenueSelection } from '../model/join-create-venue';

type Props = {
  api: ApiClient;
  state: FieldCoursePickerState;
  onChangeState: (next: FieldCoursePickerState) => void;
  onSelect: (next: JoinCreateVenueSelection) => void;
};

export function FieldCoursePickerScreen({ api, state, onChangeState, onSelect }: Props) {
  const theme = useTheme();
  const modalSafePadding = useModalSafePadding();
  const [hits, setHits] = useState<FieldGolfCourseDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(async (picker: FieldCoursePickerState) => {
    if (picker.step !== 'courses') return;
    const query = fieldCoursePickerSearchQuery(picker);
    if (!query.sido && !query.name) {
      setHits([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.searchFieldGolfCourses({
        ...query,
        page: 1,
        perPage: 40,
      });
      setHits(res.items);
      if (res.items.length === 0) {
        setError(fieldCoursePickerEmptyHint(picker));
      }
    } catch {
      setError('골프장 검색에 실패했습니다.');
      setHits([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (!state.open || state.step !== 'courses') return;
    void runSearch({
      open: state.open,
      step: state.step,
      sido: state.sido,
      sigungu: state.sigungu,
      searchName: '',
    });
  }, [runSearch, state.open, state.step, state.sido, state.sigungu]);

  const selectCourse = useCallback(
    async (course: FieldGolfCourseDto) => {
      setActivatingId(course.id);
      setError(null);
      try {
        const activated = await api.activateFieldGolfCourseVenue(course.id);
        onSelect({
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
    [api, onSelect],
  );

  const title = fieldCoursePickerTitle(state);
  const sigunguChoices = listFieldSigunguChoices(state.sido);

  return (
    <Modal visible={state.open} animationType="slide" onRequestClose={() => onChangeState(goBackFieldCoursePicker(state))}>
      <View
        style={[
          styles.modal,
          {
            backgroundColor: theme.colors.surface.base,
            paddingTop: modalSafePadding.paddingTop + spacing.sm,
            paddingBottom: modalSafePadding.paddingBottom + spacing.md,
          },
        ]}
      >
        <View style={styles.header}>
          <IconButton
            icon="back"
            accessibilityLabel="뒤로"
            onPress={() => onChangeState(goBackFieldCoursePicker(state))}
          />
          <Text variant="sectionTitle" tone="primary" style={styles.headerTitle}>
            {title}
          </Text>
        </View>

        {state.step === 'courses' ? (
          <TextInput
            value={state.searchName}
            onChangeText={(text) => onChangeState(setFieldCoursePickerSearch(state, text))}
            placeholder={state.sido ? '이 지역 골프장 이름' : '전국 골프장 이름'}
            placeholderTextColor={theme.colors.text.tertiary}
            returnKeyType="search"
            onSubmitEditing={() => void runSearch(state)}
            style={[
              styles.input,
              {
                borderColor: theme.colors.border.subtle,
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.surface.card,
              },
            ]}
          />
        ) : null}

        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          {state.step === 'sido'
            ? (
              <>
                <Pressable
                  onPress={() => onChangeState(startNationwideFieldCourseSearch(state))}
                  style={[styles.row, { borderColor: theme.colors.border.subtle }]}
                >
                  <Text variant="bodyStrong" tone="primary">{FIELD_COURSE_PICKER_NATIONWIDE_LABEL}</Text>
                  <Text variant="caption" tone="secondary">지역을 고르지 않고 이름으로 찾습니다.</Text>
                </Pressable>
                {listFieldCoursePickerSidos().map((group) => (
                  <Pressable
                    key={group.province}
                    onPress={() => onChangeState(selectFieldCoursePickerSido(state, group.province))}
                    style={[styles.row, { borderColor: theme.colors.border.subtle }]}
                  >
                    <Text variant="bodyStrong" tone="primary">{group.label}</Text>
                    <Text variant="caption" tone="secondary">{group.displayLabel}</Text>
                  </Pressable>
                ))}
              </>
            )
            : null}

          {state.step === 'sigungu'
            ? sigunguChoices.map((city) => (
              <Pressable
                key={`${city.province}-${city.cityCounty}`}
                onPress={() => onChangeState(selectFieldCoursePickerSigungu(state, city.cityCounty))}
                style={[styles.row, { borderColor: theme.colors.border.subtle }]}
              >
                <Text variant="bodyStrong" tone="primary">{city.label}</Text>
              </Pressable>
            ))
            : null}

          {state.step === 'courses' ? (
            <>
              {loading ? <ActivityIndicator color={theme.colors.action.primary} /> : null}
              {error ? <Text variant="caption" tone="error">{error}</Text> : null}
              {hits.map((course) => (
                <Pressable
                  key={course.id}
                  onPress={() => void selectCourse(course)}
                  disabled={activatingId === course.id}
                  style={[styles.row, { borderColor: theme.colors.border.subtle }]}
                >
                  <Text variant="bodyStrong" tone="primary">{course.name}</Text>
                  <Text variant="caption" tone="secondary">
                    {[
                      formatFieldCourseLocationLine({ sido: course.sido, sigungu: course.sigungu }),
                      formatFieldCourseShortAddress(course.roadAddress ?? course.address),
                    ]
                      .filter(Boolean)
                      .join(' · ') || '지역 정보 없음'}
                  </Text>
                  {activatingId === course.id ? (
                    <ActivityIndicator color={theme.colors.action.primary} size="small" />
                  ) : null}
                </Pressable>
              ))}
              <Button label="검색" onPress={() => void runSearch(state)} disabled={loading} />
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
  },
  headerTitle: {
    flex: 1,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  list: {
    gap: spacing.xs,
    paddingBottom: spacing.lg,
  },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    minHeight: 52,
    justifyContent: 'center',
  },
});
