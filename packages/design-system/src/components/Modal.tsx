import { Modal as RNModal, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../primitives/AppText';
import { Button } from './Button';
import { colors, radius, spacing } from '../tokens';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

/** Outside tap does not dismiss — intentional for gate/confirm UX. */
export function Modal({
  visible,
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '닫기',
  onConfirm,
  onCancel,
}: Props) {
  return (
    <RNModal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} />
        <View style={styles.card}>
          <AppText variant="subtitle">{title}</AppText>
          <AppText variant="body" color="textSecondary" style={styles.message}>
            {message}
          </AppText>
          <View style={styles.actions}>
            {onCancel ? (
              <Button label={cancelLabel} variant="secondary" onPress={onCancel} style={styles.btn} />
            ) : null}
            {onConfirm ? (
              <Button label={confirmLabel} onPress={onConfirm} style={styles.btn} />
            ) : null}
          </View>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  message: { marginTop: spacing.xxs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  btn: { flex: 1 },
});

