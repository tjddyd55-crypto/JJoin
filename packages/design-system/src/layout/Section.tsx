import { View, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';
import { Text } from '../primitives/Text';
import { useTheme } from '../theme';
import type { TypographyVariant } from '../tokens';

export type SectionProps = {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  gap?: 'sm' | 'md' | 'lg';
  titleVariant?: TypographyVariant;
};

export function Section({
  title,
  subtitle,
  action,
  children,
  gap = 'md',
  titleVariant = 'sectionTitle',
}: SectionProps) {
  const theme = useTheme();
  const innerGap = gap === 'sm' ? theme.spacing.sm : gap === 'lg' ? theme.spacing.lg : theme.spacing.md;

  return (
    <View style={[styles.root, { gap: innerGap, marginBottom: theme.layoutSpacing.sectionGap }]}>
      {title || subtitle || action ? (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title ? (
              <Text variant={titleVariant} tone="primary">
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text variant="meta" tone="secondary">
                {subtitle}
              </Text>
            ) : null}
          </View>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {},
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: { flex: 1, gap: 4 },
});
