import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  FormScreenFrame,
  Input,
  StickyActionFrame,
  Text,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { profileSetupSchema } from '@jjoin/validation';
import { AgeBand, Gender, SportSkillLevel } from '@jjoin/types';
import { useRouter } from 'expo-router';
import { useSession } from '../../../session/SessionContext';
import { OnboardingHeader } from '../../../ui/patterns';

export function ProfileSetupScreen() {
  const { setupProfile } = useSession();
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<Gender>(Gender.UNSPECIFIED);
  const [ageBand, setAgeBand] = useState<AgeBand>(AgeBand.UNSPECIFIED);
  const [regionLabel, setRegionLabel] = useState('');
  const [bio, setBio] = useState('');
  const [skillLevel, setSkillLevel] = useState<SportSkillLevel>(SportSkillLevel.BEGINNER);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
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
      const issue = parsed.error.issues[0];
      const field = String(issue?.path?.[0] ?? '');
      if (field === 'nickname') {
        setNicknameError(
          issue?.message === 'invalid_nickname'
            ? t('auth.profileSetup.invalidNickname')
            : t('auth.profileSetup.invalidField'),
        );
      } else {
        setNicknameError(null);
        setFormError(t('auth.profileSetup.invalidField'));
      }
      return;
    }

    setLoading(true);
    setNicknameError(null);
    setFormError(null);
    try {
      await setupProfile(parsed.data);
      router.replace('/auth/profile-photo');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('nickname_taken')) {
        setNicknameError(t('auth.profileSetup.nicknameTaken'));
      } else if (message.includes('profile_invalid')) {
        setFormError(t('auth.profileSetup.invalidField'));
      } else {
        setFormError(t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormScreenFrame
      footer={
        <StickyActionFrame>
          <Button
            label={t('auth.profileSetup.next')}
            loading={loading}
            onPress={() => void onNext()}
          />
        </StickyActionFrame>
      }
    >
      <OnboardingHeader
        step={2}
        title={t('auth.profileSetup.title')}
        description={t('auth.profileSetup.subtitle')}
      />

      <View style={styles.fields}>
        <Input
          label={t('field.nickname')}
          value={nickname}
          onChangeText={(value) => {
            setNickname(value);
            if (nicknameError) setNicknameError(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          helper={nicknameError ? undefined : t('auth.profileSetup.nicknameHelper')}
          error={nicknameError ?? undefined}
        />

        <FieldSection label={t('field.gender')}>
          <ChoiceGroup
            options={[
              { value: Gender.MALE, label: '남성' },
              { value: Gender.FEMALE, label: '여성' },
              { value: Gender.UNSPECIFIED, label: '선택 안 함' },
            ]}
            value={gender}
            onChange={setGender}
          />
        </FieldSection>

        <FieldSection label={t('field.ageBand')}>
          <ChoiceGroup
            options={[
              { value: AgeBand.TWENTIES, label: '20대' },
              { value: AgeBand.THIRTIES, label: '30대' },
              { value: AgeBand.FORTIES, label: '40대' },
              { value: AgeBand.FIFTIES_PLUS, label: '50대+' },
              { value: AgeBand.UNSPECIFIED, label: '미지정' },
            ]}
            value={ageBand}
            onChange={setAgeBand}
          />
        </FieldSection>

        <Input
          label={t('field.region')}
          value={regionLabel}
          onChangeText={setRegionLabel}
          placeholder="예: 거제"
          maxLength={80}
        />

        <Input
          label={t('field.bio')}
          value={bio}
          onChangeText={setBio}
          placeholder="같이 운동할 사람들에게 나를 소개해 주세요."
          multiline
          numberOfLines={4}
          style={styles.bioInput}
          maxLength={200}
        />

        <FieldSection label={t('field.skill')}>
          <Card variant="base" padding="md">
            <ChoiceGroup
              options={[
                { value: SportSkillLevel.BEGINNER, label: 'BEGINNER' },
                { value: SportSkillLevel.INTERMEDIATE, label: 'INTERMEDIATE' },
                { value: SportSkillLevel.ADVANCED, label: 'ADVANCED' },
                { value: SportSkillLevel.PRO, label: 'PRO' },
              ]}
              value={skillLevel}
              onChange={setSkillLevel}
            />
          </Card>
        </FieldSection>

        {formError ? (
          <Text variant="body" tone="error">
            {formError}
          </Text>
        ) : null}
      </View>
    </FormScreenFrame>
  );
}

function FieldSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldSection}>
      <Text variant="meta" tone="secondary">
        {label}
      </Text>
      {children}
    </View>
  );
}

function ChoiceGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.choiceWrap}>
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          selected={value === option.value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 24,
  },
  fieldSection: {
    gap: 8,
  },
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bioInput: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
});
