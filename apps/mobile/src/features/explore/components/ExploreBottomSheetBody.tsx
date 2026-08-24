import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Text,
  BottomSheetFrame,
  Spacer,
  useTheme,
} from '@jjoin/design-system';
import type { ExploreVenueDto, PublicNearbyUserDto } from '@jjoin/types';
import type { PresenceVisibility } from '@jjoin/types';
import { JoinCard } from '../../../ui/patterns/JoinCard';
import { VenueCard } from '../../../ui/patterns/VenueCard';
import { VenuePreviewCard } from '../../../ui/patterns/VenuePreviewCard';

export function ExploreBottomSheetBody(props: {
  mode: 'PEEK' | 'VENUE' | 'USER' | 'PRESENCE_PRIVACY' | 'PRESENCE_DURATION';
  venues: ExploreVenueDto[];
  users: PublicNearbyUserDto[];
  selectedVenue: ExploreVenueDto | null;
  selectedUser: PublicNearbyUserDto | null;
  presence: PresenceVisibility;
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
}) {
  const theme = useTheme();

  if (props.mode === 'PRESENCE_PRIVACY') {
    return (
      <BottomSheetFrame showHandle={false}>
        <Text variant="sectionTitle" tone="primary">
          주변 사용자에게 표시
        </Text>
        <Text variant="body" tone="secondary">
          주변 사용자에게 내 조인 가능 상태를 표시할까요?
        </Text>
        <Spacer size="sm" />
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
        <Button label="조인 가능 상태 켜기" onPress={props.onConfirmPrivacy} />
        <Button label="취소" variant="secondary" onPress={props.onCancelPresence} />
      </BottomSheetFrame>
    );
  }

  if (props.mode === 'PRESENCE_DURATION') {
    return (
      <BottomSheetFrame showHandle={false}>
        <Text variant="sectionTitle" tone="primary">
          지금 조인 가능
        </Text>
        <Text variant="body" tone="secondary">
          공개 시간을 선택하세요. 정확한 위치는 공개되지 않습니다.
        </Text>
        <Spacer size="sm" />
        <View style={styles.row}>
          <Button label="1시간" variant="secondary" onPress={() => props.onPickDuration('1h')} />
          <Button label="2시간" onPress={() => props.onPickDuration('2h')} />
          <Button label="오늘" variant="secondary" onPress={() => props.onPickDuration('today')} />
        </View>
      </BottomSheetFrame>
    );
  }

  if (props.mode === 'VENUE' && props.selectedVenue) {
    const v = props.selectedVenue;
    const distanceLabel =
      v.distanceMeters != null ? `${(v.distanceMeters / 1000).toFixed(1)}km` : null;
    return (
      <BottomSheetFrame showHandle={false}>
        <VenuePreviewCard
          name={v.name}
          category={v.categoryName}
          distanceLabel={distanceLabel}
          address={v.roadAddress ?? v.regionLabel ?? v.address ?? ''}
          openJoinCount={v.openJoinCount}
        />
        <Spacer size="sm" />
        {v.joinPreviews.length === 0 ? (
          <Text variant="caption" tone="tertiary">
            현재 열린 조인 없음
          </Text>
        ) : (
          v.joinPreviews.map((j) => (
            <JoinCard
              key={j.joinId}
              venue={v.name}
              startAt={j.startAt}
              participantCount={j.currentParticipants}
              plannedPlayerCount={j.maxParticipants}
              host={j.hostNickname}
              hostVerified={j.hostVerified}
              rewardPerParticipant={j.rewardCoin}
              onPress={() => props.onJoinPress(j.joinId)}
            />
          ))
        )}
        <Spacer size="sm" />
        {v.placeUrl ? (
          <Button label="카카오맵에서 보기" variant="secondary" onPress={props.onVenueDetail} />
        ) : (
          <Button label="장소 상세" variant="secondary" onPress={props.onVenueDetail} />
        )}
        {v.canCreateJoin ? (
          <Button label="여기서 조인 만들기" onPress={props.onCreateJoin} />
        ) : (
          <Text variant="caption" tone="tertiary">
            이 장소에서 조인 만들기는 곧 지원됩니다.
          </Text>
        )}
      </BottomSheetFrame>
    );
  }

  if (props.mode === 'USER' && props.selectedUser) {
    const u = props.selectedUser;
    return (
      <BottomSheetFrame showHandle={false}>
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
        <Spacer size="sm" />
        <Button label="프로필 보기" onPress={props.onOpenProfile} />
      </BottomSheetFrame>
    );
  }

  return (
    <BottomSheetFrame showHandle={false}>
      <Text variant="sectionTitle" tone="primary">
        내 주변
      </Text>
      <Text variant="meta" tone="secondary">
        스크린골프장 {props.venues.length}곳 · 지금 조인 가능 {props.users.length}명
      </Text>
      <Spacer size="sm" />
      <Button
        label={props.presence === 'AVAILABLE' ? '지금 조인 가능 ON' : '지금 조인 가능 켜기'}
        variant={props.presence === 'AVAILABLE' ? 'primary' : 'secondary'}
        onPress={props.onOpenPresence}
      />
      {props.venues.slice(0, 2).map((v) => (
        <VenueCard
          key={v.venueId}
          name={v.name}
          distance={
            v.distanceMeters != null ? `${(v.distanceMeters / 1000).toFixed(1)}km` : null
          }
          regionLabel={v.regionLabel}
          openJoinCount={v.openJoinCount}
          onPress={() => props.onSelectVenue(v.venueId)}
        />
      ))}
      {props.users.slice(0, 1).map((u) => (
        <VenueCard
          key={u.userId}
          name={`${u.nickname}${u.verifiedBadge ? ' ✓' : ''}`}
          distance={`약 ${(u.approxDistanceMeters / 1000).toFixed(1)}km`}
          regionLabel="지금 조인 가능"
          onPress={() => props.onSelectUser(u.userId)}
        />
      ))}
    </BottomSheetFrame>
  );
}

const styles = StyleSheet.create({
  infoCard: { gap: 6, padding: 14, borderWidth: 1 },
  row: { gap: 10 },
});
