import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { AppText, colors, spacing } from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import type { JoinListItemDto, MyJoinsResponse } from '@jjoin/types';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore } from '../../src/session/SessionContext';

function joinDetailHref(joinId: string): Href {
  return { pathname: '/join/[joinId]', params: { joinId } } as Href;
}
function JoinRow({ item, onPress }: { item: JoinListItemDto; onPress: () => void }) {
  const start = new Date(item.startAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <AppText variant="body">{item.venueName}</AppText>
      <AppText variant="caption" color="textSecondary">
        {start}
      </AppText>
      <AppText variant="caption">
        {item.confirmedPlayerCount}/{item.plannedPlayerCount} · {item.status}
        {item.myParticipationStatus ? ` · 나: ${item.myParticipationStatus}` : ''}
        {item.pendingApplicantCount > 0 ? ` · 신청 ${item.pendingApplicantCount}` : ''}
      </AppText>
    </Pressable>
  );
}

export default function MyJoinsScreen() {
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [data, setData] = useState<MyJoinsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await api.getMyJoins();
      setData(next);
      setError(null);
    } catch {
      setError('내 조인을 불러오지 못했습니다.');
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <AppText variant="subtitle">{t('nav.myJoins')}</AppText>
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}

      <AppText variant="body" style={styles.section}>
        내가 만든 조인
      </AppText>
      {(data?.hosted ?? []).length === 0 ? (
        <AppText variant="caption" color="textSecondary">
          없음
        </AppText>
      ) : (
        data?.hosted.map((item) => (
          <JoinRow
            key={item.joinId}
            item={item}
            onPress={() => router.push(joinDetailHref(item.joinId))}
          />
        ))
      )}

      <AppText variant="body" style={styles.section}>
        내가 참가한 조인
      </AppText>
      {(data?.participating ?? []).length === 0 ? (
        <AppText variant="caption" color="textSecondary">
          없음
        </AppText>
      ) : (
        data?.participating.map((item) => (
          <JoinRow
            key={item.joinId}
            item={item}
            onPress={() => router.push(joinDetailHref(item.joinId))}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  section: { marginTop: spacing.md },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
});
