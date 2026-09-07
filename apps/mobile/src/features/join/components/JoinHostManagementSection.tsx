import { Pressable, StyleSheet, View } from 'react-native';
import { Badge, Button, Stack, Text, useTheme } from '@jjoin/design-system';
import type { JoinDetailDto } from '@jjoin/types';

export type JoinHostManagementSectionProps = {
  detail: JoinDetailDto;
  busy: boolean;
  showUrgentToggle: boolean;
  onToggleUrgent: () => void;
  onOpenChat?: () => void;
  onEdit?: () => void;
  onInvite?: () => void;
  onOpenReviews?: () => void;
};

function SecondaryAction({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={styles.secondaryAction}
    >
      <Text
        variant="bodyStrong"
        style={{ color: disabled ? theme.colors.text.tertiary : theme.colors.join.dday.text }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function JoinHostManagementSection({
  detail,
  busy,
  showUrgentToggle,
  onToggleUrgent,
  onOpenChat,
  onEdit,
  onInvite,
  onOpenReviews,
}: JoinHostManagementSectionProps) {
  const hasSecondary = Boolean(onEdit || onInvite || onOpenReviews);
  const hasPrimary = Boolean(showUrgentToggle || onOpenChat);

  if (!hasSecondary && !hasPrimary) return null;

  return (
    <View style={styles.root}>
      <Text variant="bodyStrong" tone="primary">방장 관리</Text>

      {hasSecondary ? (
        <View style={styles.secondaryRow}>
          {onEdit ? (
            <SecondaryAction label="조인 정보 수정" onPress={onEdit} disabled={busy} />
          ) : null}
          {onInvite ? (
            <SecondaryAction label="참가자 초대" onPress={onInvite} disabled={busy} />
          ) : null}
          {onOpenReviews ? (
            <SecondaryAction label="함께한 사람 평가" onPress={onOpenReviews} disabled={busy} />
          ) : null}
        </View>
      ) : null}

      {hasPrimary ? (
        <Stack gap="sm">
          {showUrgentToggle ? (
            <View style={styles.urgentBlock}>
              {detail.isUrgent ? (
                <View style={styles.urgentStatusRow}>
                  <Badge label="긴급 모집 ON" variant="warning" />
                  <Text variant="caption" tone="secondary">활성화됨</Text>
                </View>
              ) : null}
              <Button
                label={detail.isUrgent ? '긴급 모집 끄기' : '긴급 모집 켜기'}
                variant={detail.isUrgent ? 'secondary' : 'primary'}
                loading={busy}
                onPress={onToggleUrgent}
              />
            </View>
          ) : null}
          {onOpenChat ? (
            <Button label="💬 채팅방" loading={busy} onPress={onOpenChat} />
          ) : null}
        </Stack>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
  secondaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  secondaryAction: {
    minHeight: 44,
    justifyContent: 'center',
  },
  urgentBlock: {
    gap: 8,
  },
  urgentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
