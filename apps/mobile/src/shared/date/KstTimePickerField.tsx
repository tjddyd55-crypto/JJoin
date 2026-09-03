import { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Button, Icon, Row, Text, spacing, useTheme } from '@jjoin/design-system';
import {
  formatHmDisplay,
  formatHourLabel,
  formatMinuteLabel,
  HOUR_OPTIONS,
  minuteOptionsForValue,
  normalizeHourMinute,
  parseHm,
} from './kst-time';

type Props = {
  label?: string;
  /** Canonical HH:mm value */
  valueHm: string;
  onChange: (hm: string) => void;
};

export function KstTimePickerField({ label, valueHm, onChange }: Props) {
  const theme = useTheme();
  const selectedSurface = theme.colors.state.selectedSurface;
  const selectedText = theme.colors.state.selectedText;
  const parsed = parseHm(valueHm);
  const [open, setOpen] = useState(false);
  const [directMode, setDirectMode] = useState(false);
  const [hour, setHour] = useState(parsed?.hour ?? 19);
  const [minute, setMinute] = useState(parsed?.minute ?? 0);
  const [directHour, setDirectHour] = useState(String(parsed?.hour ?? 19));
  const [directMinute, setDirectMinute] = useState(String(parsed?.minute ?? 0).padStart(2, '0'));
  const [localError, setLocalError] = useState<string | null>(null);

  const minuteOptions = useMemo(() => minuteOptionsForValue(minute), [minute]);

  useEffect(() => {
    if (!open) return;
    const next = parseHm(valueHm);
    const h = next?.hour ?? 19;
    const m = next?.minute ?? 0;
    setHour(h);
    setMinute(m);
    setDirectHour(String(h));
    setDirectMinute(String(m).padStart(2, '0'));
    setDirectMode(false);
    setLocalError(null);
  }, [open, valueHm]);

  const openPicker = () => {
    Keyboard.dismiss();
    setOpen(true);
  };

  const applyNormalized = (h: number | string, m: number | string) => {
    const result = normalizeHourMinute(h, m);
    if (!result.ok) {
      if (result.reason === 'invalid_hour') setLocalError('시는 0~23만 가능합니다.');
      else if (result.reason === 'invalid_minute') setLocalError('분은 0~59만 가능합니다.');
      else setLocalError('시와 분을 입력해 주세요.');
      return;
    }
    onChange(result.hm);
    setOpen(false);
    setLocalError(null);
  };

  return (
    <View style={styles.block}>
      {label ? (
        <Text variant="bodyStrong" tone="secondary">
          {label}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}, ${formatHmDisplay(valueHm)}` : formatHmDisplay(valueHm)}
        onPress={openPicker}
        style={[
          styles.field,
          {
            borderColor: theme.colors.border.subtle,
            backgroundColor: theme.colors.surface.card,
            minHeight: theme.sizes.input.md,
          },
        ]}
      >
        <Row align="center" gap="sm" style={styles.fieldRow}>
          <Icon name="clock" size="md" tone="tertiary" />
          <Text variant="body" style={styles.fieldText}>
            {formatHmDisplay(valueHm)}
          </Text>
          <Icon name="chevronDown" size="sm" tone="tertiary" />
        </Row>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.modal, { backgroundColor: theme.colors.surface.elevated }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text variant="sectionTitle">시간 선택</Text>

            {directMode ? (
              <View style={styles.directRow}>
                <View style={styles.directField}>
                  <Text variant="caption" tone="tertiary">
                    시
                  </Text>
                  <TextInput
                    value={directHour}
                    onChangeText={(text) => setDirectHour(text.replace(/[^\d]/g, '').slice(0, 2))}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="00"
                    placeholderTextColor={theme.colors.text.tertiary}
                    style={[
                      styles.directInput,
                      {
                        borderColor: theme.colors.border.subtle,
                        color: theme.colors.text.primary,
                        backgroundColor: theme.colors.surface.card,
                      },
                    ]}
                  />
                </View>
                <View style={styles.directField}>
                  <Text variant="caption" tone="tertiary">
                    분
                  </Text>
                  <TextInput
                    value={directMinute}
                    onChangeText={(text) => setDirectMinute(text.replace(/[^\d]/g, '').slice(0, 2))}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="00"
                    placeholderTextColor={theme.colors.text.tertiary}
                    style={[
                      styles.directInput,
                      {
                        borderColor: theme.colors.border.subtle,
                        color: theme.colors.text.primary,
                        backgroundColor: theme.colors.surface.card,
                      },
                    ]}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.selectorRow}>
                <View style={styles.selectorCol}>
                  <Text variant="caption" tone="tertiary">
                    시
                  </Text>
                  <ScrollView style={styles.list} nestedScrollEnabled>
                    {HOUR_OPTIONS.map((h) => {
                      const selected = h === hour;
                      return (
                        <Pressable
                          key={h}
                          onPress={() => setHour(h)}
                          style={[
                            styles.option,
                            selected && { backgroundColor: selectedSurface },
                          ]}
                        >
                          <Text
                            variant="body"
                            style={{
                              color: selected ? selectedText : theme.colors.text.primary,
                              textAlign: 'center',
                            }}
                          >
                            {formatHourLabel(h)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
                <View style={styles.selectorCol}>
                  <Text variant="caption" tone="tertiary">
                    분
                  </Text>
                  <ScrollView style={styles.list} nestedScrollEnabled>
                    {minuteOptions.map((m) => {
                      const selected = m === minute;
                      return (
                        <Pressable
                          key={m}
                          onPress={() => setMinute(m)}
                          style={[
                            styles.option,
                            selected && { backgroundColor: selectedSurface },
                          ]}
                        >
                          <Text
                            variant="body"
                            style={{
                              color: selected ? selectedText : theme.colors.text.primary,
                              textAlign: 'center',
                            }}
                          >
                            {formatMinuteLabel(m)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            )}

            {localError ? (
              <Text variant="caption" tone="error">
                {localError}
              </Text>
            ) : null}

            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                setDirectMode((v) => !v);
                setLocalError(null);
              }}
            >
              <Text variant="caption" tone="secondary">
                {directMode ? '목록에서 선택' : '직접 입력'}
              </Text>
            </Pressable>

            <Row gap="sm">
              <View style={styles.flex}>
                <Button label="닫기" variant="secondary" onPress={() => setOpen(false)} fullWidth />
              </View>
              <View style={styles.flex}>
                <Button
                  label="확인"
                  onPress={() => {
                    if (directMode) applyNormalized(directHour, directMinute);
                    else applyNormalized(hour, minute);
                  }}
                  fullWidth
                />
              </View>
            </Row>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.xs },
  field: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  fieldRow: { width: '100%' },
  fieldText: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modal: {
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  selectorCol: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  list: {
    maxHeight: 220,
  },
  option: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  directRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  directField: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  directInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    textAlign: 'center',
  },
  flex: { flex: 1 },
});
