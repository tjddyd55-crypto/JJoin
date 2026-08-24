import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  FormScreenFrame,
  Icon,
  Row,
  StickyActionFrame,
  Text,
  useTheme,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { useRouter } from 'expo-router';
import { AUTH_CONSENT_ITEMS, legalDocumentRoute, type LegalDocId } from '../legal';
import { useSession } from '../../../session/SessionContext';
import { OnboardingHeader } from '../../../ui/patterns';

const REQUIRED_ITEMS = AUTH_CONSENT_ITEMS.filter((item) => item.required);
const OPTIONAL_ITEMS = AUTH_CONSENT_ITEMS.filter((item) => !item.required);

type Checks = Record<(typeof AUTH_CONSENT_ITEMS)[number]['id'], boolean>;

export function TermsScreen() {
  const { acceptTerms } = useSession();
  const router = useRouter();
  const [checks, setChecks] = useState<Checks>({
    termsOfService: false,
    privacy: false,
    identity: false,
    location: false,
    marketing: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allRequired = REQUIRED_ITEMS.every((item) => checks[item.id]);
  const allChecked = Object.values(checks).every(Boolean);

  function toggleAll() {
    const next = !allChecked;
    setChecks({
      termsOfService: next,
      privacy: next,
      identity: next,
      location: next,
      marketing: next,
    });
  }

  function toggle(id: keyof Checks) {
    setChecks((current) => ({ ...current, [id]: !current[id] }));
  }

  function openDoc(docId: LegalDocId) {
    router.push(legalDocumentRoute(docId));
  }

  async function onContinue() {
    if (!allRequired) return;
    setLoading(true);
    setError(null);
    try {
      await acceptTerms(checks);
      router.replace('/auth/profile-setup');
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormScreenFrame
      footer={
        <StickyActionFrame>
          <Button
            label={t('auth.terms.next')}
            disabled={!allRequired}
            loading={loading}
            onPress={() => void onContinue()}
          />
        </StickyActionFrame>
      }
    >
      <OnboardingHeader
        step={1}
        title={t('auth.terms.title')}
        description={t('auth.terms.subtitle')}
      />

      <Card variant="elevated" padding="none" style={styles.cardPad}>
        <ConsentRow
          label={t('auth.terms.all')}
          checked={allChecked}
          emphasized
          onPress={toggleAll}
          showSeparator={false}
        />
      </Card>

      <View style={styles.section}>
        <Text variant="meta" tone="tertiary">
          {t('auth.terms.requiredGroup')}
        </Text>
        <Card variant="base" padding="none" style={styles.cardPad}>
          {REQUIRED_ITEMS.map((item, index) => (
            <ConsentRow
              key={item.id}
              label={t(item.labelKey)}
              checked={checks[item.id]}
              onPress={() => toggle(item.id)}
              onDetailPress={item.docId ? () => openDoc(item.docId!) : undefined}
              showSeparator={index < REQUIRED_ITEMS.length - 1}
            />
          ))}
        </Card>
      </View>

      <View style={styles.section}>
        <Text variant="meta" tone="tertiary">
          {t('auth.terms.optionalGroup')}
        </Text>
        <Card variant="base" padding="none" style={styles.cardPad}>
          {OPTIONAL_ITEMS.map((item, index) => (
            <ConsentRow
              key={item.id}
              label={t(item.labelKey)}
              checked={checks[item.id]}
              onPress={() => toggle(item.id)}
              onDetailPress={item.docId ? () => openDoc(item.docId!) : undefined}
              showSeparator={index < OPTIONAL_ITEMS.length - 1}
            />
          ))}
        </Card>
      </View>

      {error ? (
        <Text variant="body" tone="error">
          {error}
        </Text>
      ) : null}
    </FormScreenFrame>
  );
}

function ConsentRow({
  label,
  checked,
  onPress,
  onDetailPress,
  showSeparator = true,
  emphasized = false,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  onDetailPress?: () => void;
  showSeparator?: boolean;
  emphasized?: boolean;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.row,
        {
          borderBottomWidth: showSeparator ? StyleSheet.hairlineWidth : 0,
          borderBottomColor: theme.colors.border.subtle,
          backgroundColor: checked ? theme.colors.surface.floating : 'transparent',
        },
      ]}
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [styles.rowMain, { opacity: pressed ? 0.78 : 1 }]}
      >
        <Row align="center" gap="md" style={styles.rowInner}>
          <View
            style={[
              styles.checkbox,
              {
                borderColor: checked ? theme.colors.action.primary : theme.colors.border.subtle,
                backgroundColor: checked ? theme.colors.action.primary : theme.colors.surface.base,
                borderRadius: theme.radius.sm,
              },
            ]}
          >
            {checked ? <Icon name="check" tone="inverse" size="sm" /> : null}
          </View>
          <Text variant={emphasized ? 'bodyStrong' : 'body'} tone="primary" style={styles.label}>
            {label}
          </Text>
        </Row>
      </Pressable>
      {onDetailPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 상세`}
          onPress={onDetailPress}
          hitSlop={8}
          style={({ pressed }) => [styles.detail, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Icon name="chevronRight" tone="tertiary" size="sm" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cardPad: {
    paddingHorizontal: 16,
  },
  section: {
    gap: 8,
    marginBottom: 24,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowMain: {
    flex: 1,
    minHeight: 56,
    justifyContent: 'center',
  },
  rowInner: {
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
  },
  detail: {
    width: 40,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
