import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Card, Icon, Text, spacing, useTheme } from '@jjoin/design-system';
import type { ApiClient } from '@jjoin/api-client';
import { formatFieldCourseLocationLine } from '@jjoin/domain';
import { FieldCoursePickerScreen } from './FieldCoursePickerScreen';
import {
  FIELD_COURSE_CHANGE_LABEL,
  FIELD_COURSE_EMPTY_TRIGGER,
  closeFieldCoursePicker,
  createFieldCoursePickerState,
  openFieldCoursePicker,
} from '../model/field-course-picker';
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
  const [picker, setPicker] = useState(createFieldCoursePickerState);

  return (
    <View style={styles.root}>
      <Text variant="sectionTitle" tone="primary">골프장</Text>
      {venueSelectionHasPlace(selected) ? (
        <Card>
          <Text variant="bodyStrong" tone="primary">{selected.name}</Text>
          <Text variant="caption" tone="secondary">
            {formatFieldCourseLocationLine({ sido: selected.sido, sigungu: selected.sigungu }) ||
              selected.address}
          </Text>
          <Button
            label={FIELD_COURSE_CHANGE_LABEL}
            variant="secondary"
            onPress={() => setPicker(openFieldCoursePicker())}
          />
        </Card>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => setPicker(openFieldCoursePicker())}
          style={[
            styles.trigger,
            {
              borderColor: theme.colors.border.subtle,
              backgroundColor: theme.colors.surface.card,
            },
          ]}
        >
          <Text variant="body" tone="secondary">{FIELD_COURSE_EMPTY_TRIGGER}</Text>
          <Icon name="chevronRight" size="sm" tone="tertiary" />
        </Pressable>
      )}
      <FieldCoursePickerScreen
        api={api}
        state={picker}
        onChangeState={setPicker}
        onSelect={(next) => {
          onChange(next);
          setPicker((prev) => closeFieldCoursePicker(prev));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  trigger: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
