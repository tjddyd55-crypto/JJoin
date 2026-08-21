import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppText,
  BottomActionBar,
  Button,
  ScreenContainer,
  Stack,
  colors,
  radius,
  spacing,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { useSession } from '../../../session/SessionContext';

type Checks = {
  termsOfService: boolean;
  privacy: boolean;
  identity: boolean;
  location: boolean;
  marketing: boolean;
};

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

  const allRequired =
    checks.termsOfService && checks.privacy && checks.identity && checks.location;

  const allChecked = useMemo(
    () => Object.values(checks).every(Boolean),
    [checks],
  );

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

  async function onContinue() {
    if (!allRequired) return;
    setLoading(true);
    setError(null);
    try {
      await acceptTerms(checks);
      router.replace('/auth/identity');
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <Stack gap="md" style={styles.body}>
        <AppText variant="title">{t('auth.terms.title')}</AppText>
        <CheckRow label={t('auth.terms.all')} checked={allChecked} onPress={toggleAll} />
        <CheckRow
          label={t('auth.terms.tos')}
          checked={checks.termsOfService}
          onPress={() => setChecks((c) => ({ ...c, termsOfService: !c.termsOfService }))}
        />
        <CheckRow
          label={t('auth.terms.privacy')}
          checked={checks.privacy}
          onPress={() => setChecks((c) => ({ ...c, privacy: !c.privacy }))}
        />
        <CheckRow
          label={t('auth.terms.identity')}
          checked={checks.identity}
          onPress={() => setChecks((c) => ({ ...c, identity: !c.identity }))}
        />
        <CheckRow
          label={t('auth.terms.location')}
          checked={checks.location}
          onPress={() => setChecks((c) => ({ ...c, location: !c.location }))}
        />
        <CheckRow
          label={t('auth.terms.marketing')}
          checked={checks.marketing}
          onPress={() => setChecks((c) => ({ ...c, marketing: !c.marketing }))}
        />
        {error ? (
          <AppText variant="body" color="danger">
            {error}
          </AppText>
        ) : null}
      </Stack>
      <BottomActionBar>
        <Button
          label={t('auth.terms.next')}
          disabled={!allRequired}
          loading={loading}
          onPress={() => void onContinue()}
        />
      </BottomActionBar>
    </ScreenContainer>
  );
}

function CheckRow({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={styles.checkRow}
    >
      <View style={[styles.box, checked && styles.boxOn]} />
      <AppText variant="body" style={styles.checkLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkLabel: { flex: 1 },
});
