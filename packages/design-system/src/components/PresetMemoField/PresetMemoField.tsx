import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Input } from '../Input';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';
import { spacing } from '../../tokens';

export type PresetMemoFieldProps = {
  label: string;
  presets: readonly string[];
  customPresetLabel: string;
  value: string;
  onChange: (next: string) => void;
  maxLength: number;
  visible: boolean;
  placeholder?: string;
  style?: ViewStyle;
};

export function PresetMemoField({
  label,
  presets,
  customPresetLabel,
  value,
  onChange,
  maxLength,
  visible,
  placeholder = '메모를 입력해 주세요',
  style,
}: PresetMemoFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const options = useMemo(() => [...presets, customPresetLabel], [presets, customPresetLabel]);

  if (!visible) return null;

  const selectedPreset =
    presets.find((preset) => preset === value.trim()) ??
    (value.trim() ? customPresetLabel : '예시 문구 선택 ▼');

  return (
    <View style={[styles.root, style]}>
      <Text variant="bodyStrong" tone="primary">{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={[styles.presetBtn, { borderColor: theme.colors.border.subtle }]}
      >
        <Text variant="body" tone="secondary">{selectedPreset}</Text>
      </Pressable>
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
  presetBtn: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
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
