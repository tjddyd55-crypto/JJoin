import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Badge,
  Button,
  Text,
  BottomSheetFrame,
  Spacer,
  Stack,
  Row,
  Icon,
  useTheme,
  spacing,
} from '@jjoin/design-system';
import type { ExploreVenueDto, PublicNearbyUserDto } from '@jjoin/types';
import type { PresenceVisibility } from '@jjoin/types';
import { PresenceVisibility as PresenceVisibilityEnum } from '@jjoin/types';
import { JoinCard } from '../../../ui/patterns/JoinCard';
import { VenueCard } from '../../../ui/patterns/VenueCard';
import { VenuePreviewCard } from '../../../ui/patterns/VenuePreviewCard';
import { useJoinDiscoveryOptional } from '../discovery/JoinDiscoveryContext';
import { localDayKey } from '@jjoin/domain';
import type { ExploreFilterId } from '../model/map-types';
import { FacilityFollowWeeklySection } from '../../engagement/FacilityFollowWeeklySection';

function PresenceStatusBlock({ presence }: { presence: PresenceVisibility }) {
  const on = presence === PresenceVisibilityEnum.AVAILABLE;
  return (
    <Stack gap="xs">
      <Text variant="meta" tone="tertiary">
        현재 상태
      </Text>
      <Row gap="sm" align="center">
        <Badge label={on ? '조인 가능 ON' : '조인 쉬는 중'} variant={on ? 'gold' : 'neutral'} />
      </Row>
      <Text variant="caption" tone="tertiary">
        {on
          ? '주변 사용자가 나를 조인 가능한 상태로 볼 수 있습니다.'
          : '현재는 조인 가능한 사용자로 표시되지 않습니다.'}
      </Text>
    </Stack>
  );
}

export function ExploreBottomSheetBody(props: {
  mode: 'PEEK' | 'VENUE' | 'USER' | 'PRESENCE_PRIVACY' | 'PRESENCE_DURATION';
  venues: ExploreVenueDto[];
  users: PublicNearbyUserDto[];
  selectedVenue: ExploreVenueDto | null;
  selectedUser: PublicNearbyUserDto | null;
  presence: PresenceVisibility;
  /** Screen tab collapsed sheet — header line only */
  compactPeek?: boolean;
  onSelectVenue: (id: string) => void;
  onSelectUser: (id: string) => void;
  onOpenPresence: () => void;
  onConfirmPrivacy: () => void;
  onCancelPresence: () => void;
  onPickDuration: (d: '1h' | '2h' | 'today') => void;
  onCreateJoin: () => void;
  onVenueDetail: () => void;
  onOpenProfile: () => void;
  onJoinPress: (joinId: string) => void;
  /** 선택된 장소 해제 — marker/card 닫기 */
  onDismissSelection?: () => void;
  /** Override primary CTA label (e.g. GolfFacility confirm). */
  createJoinLabel?: string;
  /** Presence ON/OFF — Join tab only; Screen facility map hides them. */
  showPresence?: boolean;
  /** Screen tab — active map filter for list emphasis */
  mapFilter?: ExploreFilterId;
  /** Incremental venue list cap (Screen tab expanded sheet). */
  venueListLimit?: number;
  onLoadMoreVenues?: () => void;
  peekTitle?: string;
  peekSubtitle?: string;
}) {
  const theme = useTheme();
  const showPresence = props.showPresence !== false;
  const mapFilter = props.mapFilter ?? 'ALL';
  const venueListLimit = props.venueListLimit ?? props.venues.length;
  const discovery = useJoinDiscoveryOptional();
  const selectedDate = discovery?.filter.date;
  const isSelectedToday =
    !selectedDate || selectedDate === localDayKey(new Date());

  if (props.mode === 'PRESENCE_PRIVACY') {
    return (
      <BottomSheetFrame showHandle={false}>
        <Stack gap="md">
          <Stack gap="xs">
            <Text variant="sectionTitle" tone="primary">
              주변 사용자에게 표시
            </Text>
            <Text variant="body" tone="secondary">
              주변 사용자에게 내 조인 가능 상태를 표시할까요?
            </Text>
          </Stack>
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: theme.colors.surface.card,
                borderColor: theme.colors.border.subtle,
                borderRadius: theme.radius.md,
              },
            ]}
          >
            <Text variant="bodyStrong" tone="primary">
              표시되는 정보
            </Text>
            <Text variant="caption" tone="secondary">
              · 프로필 사진 · 닉네임 · 본인확인 배지
            </Text>
            <Text variant="caption" tone="secondary">
              · 대략 거리 · 스포츠 실력
            </Text>
            <Text variant="bodyStrong" tone="primary">
              표시되지 않음
            </Text>
            <Text variant="caption" tone="secondary">
              · 정확한 위치 · 전화번호 · 실명
            </Text>
          </View>
          <Stack gap="sm">
            <Button label="조인 가능 상태 켜기" onPress={props.onConfirmPrivacy} />
            <Button label="취소" variant="secondary" onPress={props.onCancelPresence} />
          </Stack>
        </Stack>
      </BottomSheetFrame>
    );
  }

  if (props.mode === 'PRESENCE_DURATION') {
    return (
      <BottomSheetFrame showHandle={false}>
        <Stack gap="md">
          <Stack gap="xs">
            <Text variant="sectionTitle" tone="primary">
              지금 조인 가능
            </Text>
            <Text variant="body" tone="secondary">
              공개 시간을 선택하세요. 정확한 위치는 공개되지 않습니다.
            </Text>
          </Stack>
          <Stack gap="sm">
            <Button label="1시간" variant="secondary" onPress={() => props.onPickDuration('1h')} />
            <Button label="2시간" onPress={() => props.onPickDuration('2h')} />
            <Button label="오늘" variant="secondary" onPress={() => props.onPickDuration('today')} />
          </Stack>
        </Stack>
      </BottomSheetFrame>
    );
  }

  if (props.mode === 'VENUE' && props.selectedVenue) {
    const v = props.selectedVenue;
    const distanceLabel =
      v.distanceMeters != null ? `${(v.distanceMeters / 1000).toFixed(1)}km` : null;
    const today = v.todayJoinCount ?? 0;
    const ongoing = v.ongoingJoinCount ?? 0;
    const urgent = v.urgentJoinCount ?? 0;
    const dateJoinLabel = isSelectedToday
      ? `오늘 조인 ${today}개`
      : `${selectedDate!.slice(5).replace('-', '/')} 조인 ${today}개`;
    return (
      <BottomSheetFrame showHandle={false}>
        <Stack gap="md">
          {props.onDismissSelection ? (
            <Row align="center" justify="flex-end">
              <Pressable
                onPress={props.onDismissSelection}
                accessibilityRole="button"
                accessibilityLabel="선택 해제"
                hitSlop={8}
                style={styles.dismissBtn}
              >
                <Icon name="close" size="md" tone="secondary" />
              </Pressable>
            </Row>
          ) : null}
          <VenuePreviewCard
            name={v.name}
            category={v.categoryName}
            distanceLabel={distanceLabel}
            address={v.roadAddress ?? v.regionLabel ?? v.address ?? ''}
            openJoinCount={v.openJoinCount}
            todayJoinCount={today}
            ongoingJoinCount={ongoing}
            urgentJoinCount={urgent}
          />
          {v.golfFacilityId || v.source === 'GOLF_FACILITY' ? (
            <FacilityFollowWeeklySection
              golfFacilityId={v.golfFacilityId ?? v.venueId}
              venueName={v.name}
              onJoinPress={props.onJoinPress}
            />
          ) : null}
          {v.joinPreviews.length === 0 ? (
            <Text variant="caption" tone="tertiary">
              현재 열린 조인 없음
            </Text>
          ) : (
            <Stack gap="sm">
              {(ongoing > 0 || today > 0 || urgent > 0) && (
                <Text variant="meta" tone="secondary">
                  {[
                    ongoing > 0 ? `현재 진행 중 ${ongoing}개` : null,
                    today > 0 ? dateJoinLabel : null,
                    urgent > 0 ? `긴급 모집 ${urgent}개` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              )}
              {v.joinPreviews.map((j) => (
                <JoinCard
                  key={j.joinId}
                  title={j.title}
                  venue={v.name}
                  startAt={j.startAt}
                  scheduledEndAt={j.scheduledEndAt}
                  joinStatus={j.status}
                  participantCount={j.currentParticipants}
                  plannedPlayerCount={j.maxParticipants}
                  host={j.hostNickname}
                  hostAvatarUrl={j.hostAvatarUrl}
                  hostVerified={j.hostVerified}
                  rewardPerParticipant={j.rewardCoin}
                  isUrgent={j.isUrgent}
                  onPress={() => props.onJoinPress(j.joinId)}
                />
              ))}
            </Stack>
          )}
          <Stack gap="sm">
            {v.placeUrl ? (
              <Button label="카카오맵에서 보기" variant="secondary" onPress={props.onVenueDetail} />
            ) : (
              <Button label="장소 상세" variant="secondary" onPress={props.onVenueDetail} />
            )}
            {v.canCreateJoin ? (
              <Button
                label={props.createJoinLabel ?? '여기서 조인 만들기'}
                onPress={props.onCreateJoin}
              />
            ) : (
              <Text variant="caption" tone="tertiary">
                {v.source === 'GOLF_FACILITY'
                  ? '위치 정보 확인 중인 시설입니다.'
                  : '이 장소에서 조인 만들기는 곧 지원됩니다.'}
              </Text>
            )}
          </Stack>
        </Stack>
      </BottomSheetFrame>
    );
  }

  if (props.mode === 'USER' && props.selectedUser) {
    const u = props.selectedUser;
    return (
      <BottomSheetFrame showHandle={false}>
        <Stack gap="md">
          <Stack gap="xs">
            <Text variant="sectionTitle" tone="primary">
              {u.nickname}
              {u.verifiedBadge ? ' ✓' : ''}
            </Text>
            <Text variant="meta" tone="secondary">
              {u.ageBand ?? '나이대 비공개'} · {u.skillLevel ?? '실력 미설정'}
            </Text>
            <Text variant="meta" tone="tertiary">
              약 {(u.approxDistanceMeters / 1000).toFixed(1)}km · {u.regionLabel ?? '주변'}
            </Text>
            <Text variant="bodyStrong" style={{ color: theme.colors.action.primary }}>
              지금 조인 가능
            </Text>
            <Text variant="caption" tone="tertiary">
              정확한 위치는 공개되지 않습니다.
            </Text>
          </Stack>
          <Button label="프로필 보기" onPress={props.onOpenProfile} />
        </Stack>
      </BottomSheetFrame>
    );
  }

  const presenceOn = props.presence === PresenceVisibilityEnum.AVAILABLE;
  const peekTitle = props.peekTitle ?? '내 주변';
  const venueCount = props.venues.length;
  const userCount = props.users.length;
  const showVenueList = mapFilter !== 'USER';
  const showUserList = mapFilter === 'USER' || mapFilter === 'ALL';
  const visibleVenues = showVenueList
    ? props.venues.slice(0, venueListLimit)
    : [];
  const hasMoreVenues = showVenueList && venueCount > visibleVenues.length;
  const peekLine = showPresence
    ? `${peekTitle} · ${venueCount}곳 · 조인 가능 ${userCount}명`
    : mapFilter === 'USER'
      ? `${peekTitle} · 조인 가능 ${userCount}명`
      : `${peekTitle} · ${venueCount}곳`;

  if (props.compactPeek) {
    return (
      <BottomSheetFrame showHandle={false}>
        <Text variant="bodyStrong" tone="primary" numberOfLines={1}>
          {peekLine}
        </Text>
      </BottomSheetFrame>
    );
  }

  const peekSubtitle =
    props.peekSubtitle ??
    (() => {
      const urgentTotal = props.venues.reduce((sum, v) => sum + (v.urgentJoinCount ?? 0), 0);
      const urgentHint = urgentTotal > 0 ? ` · 긴급 ${urgentTotal}` : '';
      if (showPresence) {
        return `스크린골프장 ${venueCount}곳 · 지금 조인 가능 ${userCount}명${urgentHint}`;
      }
      if (mapFilter === 'USER') {
        return `지금 조인 가능 ${userCount}명`;
      }
      return `주변 스크린골프장 ${venueCount}곳${urgentHint}`;
    })();

  return (
    <BottomSheetFrame showHandle={false}>
      <Stack gap="md">
        <Stack gap="xs">
          <Text variant="sectionTitle" tone="primary">
            {peekTitle}
          </Text>
          <Text variant="meta" tone="secondary">
            {peekSubtitle}
          </Text>
        </Stack>
        {showPresence ? (
          <>
            <PresenceStatusBlock presence={props.presence} />
            <Button
              label={presenceOn ? '조인 가능 끄기' : '조인 가능 켜기'}
              variant={presenceOn ? 'secondary' : 'primary'}
              onPress={props.onOpenPresence}
            />
          </>
        ) : null}
        {mapFilter === 'USER' && userCount === 0 ? (
          <Text variant="caption" tone="tertiary">
            주변에 조인 가능 상태인 사용자가 없습니다.
          </Text>
        ) : null}
        <Stack gap="sm">
          {visibleVenues.map((v) => (
            <VenueCard
              key={v.venueId}
              name={v.name}
              distance={
                v.distanceMeters != null ? `${(v.distanceMeters / 1000).toFixed(1)}km` : null
              }
              regionLabel={v.regionLabel}
              openJoinCount={v.openJoinCount}
              todayJoinableCount={v.todayJoinableCount ?? 0}
              urgentJoinCount={v.urgentJoinCount ?? 0}
              onPress={() => props.onSelectVenue(v.venueId)}
            />
          ))}
          {hasMoreVenues && props.onLoadMoreVenues ? (
            <Button
              label={`더 보기 (${venueCount - visibleVenues.length}곳 남음)`}
              variant="secondary"
              onPress={props.onLoadMoreVenues}
            />
          ) : null}
          {showUserList
            ? props.users.map((u) => (
                <VenueCard
                  key={u.userId}
                  name={`${u.nickname}${u.verifiedBadge ? ' ✓' : ''}`}
                  distance={`약 ${(u.approxDistanceMeters / 1000).toFixed(1)}km`}
                  regionLabel="지금 조인 가능"
                  onPress={() => props.onSelectUser(u.userId)}
                />
              ))
            : null}
        </Stack>
      </Stack>
    </BottomSheetFrame>
  );
}

const styles = StyleSheet.create({
  infoCard: { gap: spacing.xs, padding: spacing.sm, borderWidth: 1 },
  dismissBtn: {
    marginTop: -spacing.xs,
    marginBottom: -spacing.sm,
    padding: spacing.xs,
  },
});
