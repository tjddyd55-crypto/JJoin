import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Input } from '../Input';
import { SelectTrigger } from '../SelectTrigger';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';
import { spacing } from '../../tokens';

export type PresetMemoFieldProps = {
  presets: readonly string[];
  customPresetLabel: string;
  value: string;
  onChange: (next: string) => void;
  maxLength: number;
  visible: boolean;
  placeholder?: string;
  triggerPlaceholder?: string;
  style?: ViewStyle;
};

function resolveTriggerLabel(
  value: string,
  presets: readonly string[],
  customPresetLabel: string,
  triggerPlaceholder: string,
): string {
  const trimmed = value.trim();
  if (!trimmed) return triggerPlaceholder;
  const matched = presets.some((preset) => preset === trimmed);
  if (matched) return triggerPlaceholder;
  return customPresetLabel;
}

export function PresetMemoField({
  presets,
  customPresetLabel,
  value,
  onChange,
  maxLength,
  visible,
  placeholder = '내용을 입력해 주세요',
  triggerPlaceholder = '예시 문구 선택',
  style,
}: PresetMemoFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const options = useMemo(() => [...presets, customPresetLabel], [presets, customPresetLabel]);

  if (!visible) return null;

  const triggerLabel = resolveTriggerLabel(
    value,
    presets,
    customPresetLabel,
    triggerPlaceholder,
  );

  return (
    <View style={[styles.root, style]}>
      <SelectTrigger label={triggerLabel} onPress={() => setOpen(true)} />
      <Input
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        multiline
        maxLength={maxLength}
      />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: theme.colors.surface.base }]}>
            {options.map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                onPress={() => {
                  onChange(option === customPresetLabel ? '' : option);
                  setOpen(false);
                }}
                style={styles.option}
              >
                <Text variant="body" tone="primary">{option}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.md,
    gap: spacing.xs,
    maxHeight: '70%',
  },
  option: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
});
