import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Card, Text } from '@jjoin/design-system';

export const CLUB_SCREEN_HORIZONTAL = 16;
export const CLUB_SECTION_GAP = 16;

export type ClubFormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ClubFormSection({ title, description, children, style }: ClubFormSectionProps) {
  return (
    <Card padding="md" style={[styles.card, style]}>
      <Text variant="joinSectionTitle">{title}</Text>
      {description ? (
        <Text variant="clubMeta" tone="tertiary" style={styles.description}>
          {description}
        </Text>
      ) : null}
      <View style={styles.body}>{children}</View>
    </Card>
  );
}

export function ClubFormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="bodyStrong">{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  description: {
    marginTop: 4,
  },
  body: {
    gap: 12,
    marginTop: 4,
  },
  field: {
    gap: 8,
  },
});
