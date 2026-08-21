import { useState } from 'react';
import { ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppText,
  BottomActionBar,
  Button,
  FormField,
  ScreenContainer,
  Stack,
  colors,
  radius,
  spacing,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { profileSetupSchema } from '@jjoin/validation';
import { AgeBand, Gender, SportSkillLevel } from '@jjoin/types';
import { useSession } from '../../../session/SessionContext';

export function ProfileSetupScreen() {
  const { setupProfile } = useSession();
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<Gender>(Gender.UNSPECIFIED);
  const [ageBand, setAgeBand] = useState<AgeBand>(AgeBand.UNSPECIFIED);
  const [regionLabel, setRegionLabel] = useState('');
  const [bio, setBio] = useState('');
  const [skillLevel, setSkillLevel] = useState<SportSkillLevel>(SportSkillLevel.BEGINNER);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onNext() {
    const parsed = profileSetupSchema.safeParse({
      nickname,
      gender,
      ageBand,
      regionLabel,
      bio,
      sportCode: 'SCREEN_GOLF',
      skillLevel,
    });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? t('common.error'));
      return;
    }
    setLoading(true);
    setFieldError(null);
    try {
      await setupProfile(parsed.data);
      router.replace('/auth/profile-photo');
    } catch {
      setFieldError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Stack gap="md">
          <AppText variant="title">{t('auth.profileSetup.title')}</AppText>
          <FormField
            label={t('field.nickname')}
            value={nickname}
            onChangeText={setNickname}
            autoCapitalize="none"
          />
          <AppText variant="label" color="textSecondary">
            {t('field.gender')}
          </AppText>
          <OptionRow
            options={[
              { value: Gender.MALE, label: '남성' },
              { value: Gender.FEMALE, label: '여성' },
              { value: Gender.UNSPECIFIED, label: '선택 안 함' },
            ]}
            value={gender}
            onChange={setGender}
          />
          <AppText variant="label" color="textSecondary">
            {t('field.ageBand')}
          </AppText>
          <OptionRow
            options={[
              { value: AgeBand.TWENTIES, label: '20대' },
              { value: AgeBand.THIRTIES, label: '30대' },
              { value: AgeBand.FORTIES, label: '40대' },
              { value: AgeBand.UNSPECIFIED, label: '미지정' },
            ]}
            value={ageBand}
            onChange={setAgeBand}
          />
          <FormField
            label={t('field.region')}
            value={regionLabel}
            onChangeText={setRegionLabel}
            placeholder="예: 거제"
          />
          <FormField
            label={t('field.bio')}
            value={bio}
            onChangeText={setBio}
            multiline
            style={{ minHeight: 80 }}
          />
          <AppText variant="label" color="textSecondary">
            {t('field.skill')}
          </AppText>
          <OptionRow
            options={[
              { value: SportSkillLevel.BEGINNER, label: 'BEGINNER' },
              { value: SportSkillLevel.INTERMEDIATE, label: 'INTERMEDIATE' },
              { value: SportSkillLevel.ADVANCED, label: 'ADVANCED' },
            ]}
            value={skillLevel}
            onChange={setSkillLevel}
          />
          {fieldError ? (
            <AppText variant="body" color="danger">
              {fieldError}
            </AppText>
          ) : null}
        </Stack>
      </ScrollView>
      <BottomActionBar>
        <Button
          label={t('auth.profileSetup.next')}
          loading={loading}
          onPress={() => void onNext()}
        />
      </BottomActionBar>
    </ScreenContainer>
  );
}

function OptionRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.options}>
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          accessibilityRole="button"
          onPress={() => onChange(opt.value)}
          style={[styles.opt, value === opt.value && styles.optOn]}
        >
          <AppText variant="caption">{opt.label}</AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  opt: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 44,
    justifyContent: 'center',
  },
  optOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
});
