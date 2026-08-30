import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button, Stack, Text } from '@jjoin/design-system';
import { localDayKey, shiftWeekAnchor } from '@jjoin/domain';
import type { FacilityWeeklyJoinsResponse, JoinListItemDto } from '@jjoin/types';
import { getApiClient } from '../../lib/api';
import { getSecureSessionStore } from '../../session/SessionContext';
import { WeekStrip } from '../explore/discovery/components/WeekStrip';
import { JoinCard } from '../../ui/patterns/JoinCard';

export function FacilityFollowWeeklySection(props: {
  golfFacilityId: string;
  venueName: string;
  onJoinPress: (joinId: string) => void;
}) {
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [selectedDate, setSelectedDate] = useState(localDayKey(new Date()));
  const [weekAnchorDate, setWeekAnchorDate] = useState(localDayKey(new Date()));
  const [weekly, setWeekly] = useState<FacilityWeeklyJoinsResponse | null>(null);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);

  const loadFollow = useCallback(async () => {
    try {
      const follows = await api.listFacilityFollows();
      setFollowing(follows.some((f) => f.golfFacilityId === props.golfFacilityId));
    } catch {
      // non-blocking
    }
  }, [api, props.golfFacilityId]);

  const loadWeekly = useCallback(
    async (date: string) => {
      setWeeklyError(null);
      try {
        const res = await api.getFacilityWeeklyJoins(props.golfFacilityId, date);
        setWeekly(res);
        setSelectedDate(res.selectedDate);
      } catch {
        setWeeklyError('이번 주 조인을 불러오지 못했습니다.');
        setWeekly(null);
      }
    },
    [api, props.golfFacilityId],
  );

  useEffect(() => {
    void loadFollow();
    void loadWeekly(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when facility changes
  }, [loadFollow, loadWeekly, props.golfFacilityId]);

  async function onToggleFollow() {
    setFollowBusy(true);
    try {
      if (following) {
        await api.unfollowFacility(props.golfFacilityId);
        setFollowing(false);
      } else {
        await api.followFacility(props.golfFacilityId);
        setFollowing(true);
      }
    } catch {
      // keep previous state
    } finally {
      setFollowBusy(false);
    }
  }

  const joins: JoinListItemDto[] = weekly?.joins ?? [];
  const dayCounts = useMemo(() => {
    const record: Record<string, number> = {};
    for (const day of weekly?.weekDays ?? []) {
      record[day.date] = day.count;
    }
    return record;
  }, [weekly]);

  return (
    <Stack gap="sm" style={styles.root}>
      <Button
        label={following ? '팔로잉' : '팔로우'}
        variant={following ? 'secondary' : 'primary'}
        loading={followBusy}
        onPress={() => void onToggleFollow()}
      />
      <Text variant="meta" tone="secondary">
        이번 주 조인
      </Text>
      <WeekStrip
        weekAnchorDate={weekAnchorDate}
        selectedDate={selectedDate}
        dayCounts={dayCounts}
        onSelectDate={(date) => {
          setSelectedDate(date);
          void loadWeekly(date);
        }}
        onPrevWeek={() => {
          const nextAnchor = shiftWeekAnchor(weekAnchorDate, -1);
          setWeekAnchorDate(nextAnchor);
          setSelectedDate(nextAnchor);
          void loadWeekly(nextAnchor);
        }}
        onNextWeek={() => {
          const nextAnchor = shiftWeekAnchor(weekAnchorDate, 1);
          setWeekAnchorDate(nextAnchor);
          setSelectedDate(nextAnchor);
          void loadWeekly(nextAnchor);
        }}
        compact
      />
      {weeklyError ? (
        <Text variant="caption" tone="error">
          {weeklyError}
        </Text>
      ) : null}
      {joins.length === 0 && !weeklyError ? (
        <Text variant="caption" tone="tertiary">
          선택한 날짜에 조인이 없습니다.
        </Text>
      ) : (
        <Stack gap="sm">
          {joins.map((j) => (
            <JoinCard
              key={j.joinId}
              venue={props.venueName}
              startAt={j.startAt}
              participantCount={j.confirmedPlayerCount}
              plannedPlayerCount={j.plannedPlayerCount}
              host={j.hostNickname}
              rewardPerParticipant={j.rewardPerParticipant}
              onPress={() => props.onJoinPress(j.joinId)}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 4 },
});
