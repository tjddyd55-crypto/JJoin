import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AppText,
  ScreenContainer,
  Stack,
  StatusBadge,
  UserAvatar,
  spacing,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import type { PublicUserProfileDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { createExpoSecureSessionStore } from '../../../session/expo-secure-session-store';

const store = createExpoSecureSessionStore();

export function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<PublicUserProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!userId) {
        setError(t('common.error'));
        setLoading(false);
        return;
      }
      try {
        const api = getApiClient(store);
        const data = await api.getPublicProfile(userId);
        if (alive) setProfile(data);
      } catch {
        if (alive) setError(t('common.error'));
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <ScreenContainer>
        <AppText>{t('common.loading')}</AppText>
      </ScreenContainer>
    );
  }

  if (error || !profile) {
    return (
      <ScreenContainer>
        <AppText color="danger">{error ?? t('common.empty')}</AppText>
      </ScreenContainer>
    );
  }

  const skill = profile.sportProfiles.find((s) => s.sportCode === 'SCREEN_GOLF');

  return (
    <ScreenContainer>
      <Stack gap="md">
        <AppText variant="title">{t('profile.public.title')}</AppText>
        <View style={styles.header}>
          <UserAvatar uri={profile.avatarUrl} name={profile.nickname} size="lg" />
          <Stack gap="xs">
            <AppText variant="subtitle">{profile.nickname}</AppText>
            {profile.verifiedBadge ? (
              <StatusBadge label={t('profile.verified')} tone="success" />
            ) : null}
          </Stack>
        </View>
        <AppText variant="body" color="textSecondary">
          {[profile.genderDisplay, profile.ageBand, profile.regionLabel]
            .filter(Boolean)
            .join(' · ') || '-'}
        </AppText>
        {profile.bio ? <AppText variant="body">{profile.bio}</AppText> : null}
        <AppText variant="label" color="textSecondary">
          {t('profile.skill')}
        </AppText>
        <AppText variant="body">{skill?.skillLevel ?? '-'}</AppText>
        <AppText variant="label" color="textSecondary">
          {t('profile.participationCount')}
        </AppText>
        <AppText variant="body">{String(profile.participationCount)}</AppText>
        <AppText variant="label" color="textSecondary">
          참석
        </AppText>
        <AppText variant="body">{String(profile.completedJoinCount ?? 0)}</AppText>
        <AppText variant="label" color="textSecondary">
          노쇼
        </AppText>
        <AppText variant="body">{String(profile.noShowCount ?? 0)}</AppText>
        <AppText variant="label" color="textSecondary">
          참석률
        </AppText>
        <AppText variant="body">
          {profile.attendanceRatePercent == null
            ? '-'
            : `${profile.attendanceRatePercent}%`}
        </AppText>
        <AppText
          variant="caption"
          color="primary"
          onPress={() => router.back()}
          accessibilityRole="button"
        >
          ← Back
        </AppText>
      </Stack>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
