import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  ProfileAvatar,
  Text,
  useTheme,
} from '@jjoin/design-system';
import type { FieldJoinMemberCardModel } from '../model/field-join-member-card';

type Props = {
  model: FieldJoinMemberCardModel;
  onOpenProfile: () => void;
  actions?: ReactNode;
};

function MetricChip({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.metricChip,
        {
          backgroundColor: theme.colors.surface.soft,
          borderColor: theme.colors.border.subtle,
        },
      ]}
    >
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
    </View>
  );
}

export function FieldJoinMemberProfileCard({ model, onOpenProfile, actions }: Props) {
  return (
    <Card variant="base" padding="md" style={styles.card}>
      <View style={styles.header}>
        <ProfileAvatar imageUrl={model.avatarUrl} name={model.nickname} size="md" />
        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <Text variant="bodyStrong" tone="primary" numberOfLines={1} style={styles.name}>
              {model.nickname}
            </Text>
            <Badge
              label={model.roleBadge}
              variant={model.roleBadge === '방장' ? 'accent' : 'neutral'}
            />
          </View>
          {model.identityLine ? (
            <Text variant="caption" tone="secondary">
              {model.identityLine}
            </Text>
          ) : null}
          {model.faceLabel && model.roleBadge !== '방장' ? (
            <Text variant="caption" tone="tertiary">
              {model.faceLabel}
            </Text>
          ) : null}
        </View>
      </View>

      {model.metrics.length > 0 ? (
        <View style={styles.metrics}>
          {model.metrics.map((label) => (
            <MetricChip key={label} label={label} />
          ))}
        </View>
      ) : null}

      {model.applicationNote ? (
        <Text variant="caption" tone="secondary">
          신청 한마디 · {model.applicationNote}
        </Text>
      ) : null}
      {model.conditionHint ? (
        <Text variant="caption" tone="secondary">
          {model.conditionHint}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <Button
          label="프로필 보기"
          variant="secondary"
          fullWidth={false}
          onPress={onOpenProfile}
        />
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flexShrink: 1,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metricChip: {
    width: '48%',
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  footer: {
    flexDirection: 'row',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
