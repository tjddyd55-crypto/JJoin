import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Card, Chip, ScrollScreenFrame, Stack, Text, spacing } from '@jjoin/design-system';
import { formatAttendanceRateDisplay } from '@jjoin/domain';
import type { ClubMemberAttendanceDetailDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

const PERIODS = [
  { value: 'RECENT_30D' as const, label: '최근 30일' },
  { value: 'THIS_YEAR' as const, label: '올해' },
  { value: 'ALL' as const, label: '전체' },
];

export function ClubMemberDetailScreen() {
  const { clubId, userId } = useLocalSearchParams<{ clubId: string; userId: string }>();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [period, setPeriod] = useState<'RECENT_30D' | 'THIS_YEAR' | 'ALL'>('THIS_YEAR');
  const [detail, setDetail] = useState<ClubMemberAttendanceDetailDto | null>(null);

  const load = useCallback(async () => {
    if (!clubId || !userId) return;
    setDetail(await api.getClubMemberAttendanceDetail(clubId, userId, period));
  }, [api, clubId, period, userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Stack gap="md">
        <Text variant="screenTitle">{detail?.nickname ?? '회원 통계'}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {PERIODS.map((p) => (
            <Chip key={p.value} label={p.label} selected={period === p.value} onPress={() => setPeriod(p.value)} />
          ))}
        </View>
        {detail ? (
          <>
            <Card padding="md">
              <Stack gap="xs">
                <Text>대상 모임 {detail.targetEvents}</Text>
                <Text>참석 {detail.attended}</Text>
                <Text>불참 {detail.declined}</Text>
                <Text>미응답 {detail.noResponse}</Text>
                <Text>노쇼 {detail.noShow}</Text>
                <Text variant="bodyStrong">
                  참석률 {formatAttendanceRateDisplay(detail.averageAttendanceRate)}
                </Text>
              </Stack>
            </Card>
            <Text variant="sectionTitle">참석 이력</Text>
            {detail.history.map((row) => (
              <Card key={row.eventId} padding="sm">
                <Text variant="body">
                  {new Date(row.startsAt).toLocaleDateString('ko-KR')} · {row.title}
                </Text>
                <Text variant="caption" tone="secondary">
                  {row.response}
                  {row.finalStatus ? ` · ${row.finalStatus}` : ''}
                </Text>
              </Card>
            ))}
          </>
        ) : (
          <Text tone="secondary">불러오는 중…</Text>
        )}
      </Stack>
    </ScrollScreenFrame>
  );
}
