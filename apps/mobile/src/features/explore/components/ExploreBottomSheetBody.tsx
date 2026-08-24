import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, colors, radius, spacing } from '@jjoin/design-system';
import type { ExploreVenueDto, PublicNearbyUserDto } from '@jjoin/types';
import type { PresenceVisibility } from '@jjoin/types';

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
  /** Override primary CTA label (e.g. GolfFacility confirm). */
  createJoinLabel?: string;
}) {
  if (props.mode === 'PRESENCE_PRIVACY') {
    return (
      <View style={styles.block}>
        <AppText variant="subtitle">주변 사용자에게 표시</AppText>
        <AppText variant="body" color="textSecondary">
          주변 사용자에게 내 조인 가능 상태를 표시할까요?
        </AppText>
        <View style={styles.card}>
          <AppText variant="body">표시되는 정보</AppText>
          <AppText variant="caption" color="textSecondary">
            · 프로필 사진 · 닉네임 · 본인확인 배지
          </AppText>
          <AppText variant="caption" color="textSecondary">
            · 대략 거리 · 스포츠 실력
          </AppText>
          <AppText variant="body">표시되지 않음</AppText>
          <AppText variant="caption" color="textSecondary">
            · 정확한 위치 · 전화번호 · 실명
          </AppText>
        </View>
        <Button label="조인 가능 상태 켜기" onPress={props.onConfirmPrivacy} />
        <Button label="취소" variant="secondary" onPress={props.onCancelPresence} />
      </View>
    );
  }

  if (props.mode === 'PRESENCE_DURATION') {
    return (
      <View style={styles.block}>
        <AppText variant="subtitle">지금 조인 가능</AppText>
        <AppText variant="body" color="textSecondary">
          공개 시간을 선택하세요. 정확한 위치는 공개되지 않습니다.
        </AppText>
        <View style={styles.row}>
          <Button label="1시간" variant="secondary" onPress={() => props.onPickDuration('1h')} />
          <Button label="2시간" onPress={() => props.onPickDuration('2h')} />
          <Button label="오늘" variant="secondary" onPress={() => props.onPickDuration('today')} />
        </View>
      </View>
    );
  }

  if (props.mode === 'VENUE' && props.selectedVenue) {
    const v = props.selectedVenue;
    return (
      <View style={styles.block}>
        <AppText variant="subtitle">{v.name}</AppText>
        {v.categoryName ? (
          <AppText variant="caption" color="textSecondary">
            {v.categoryName}
          </AppText>
        ) : null}
        <AppText variant="caption" color="textSecondary">
          {v.distanceMeters != null ? `${(v.distanceMeters / 1000).toFixed(1)}km · ` : ''}
          {v.roadAddress ?? v.regionLabel ?? v.address ?? ''}
        </AppText>
        {v.address && v.roadAddress ? (
          <AppText variant="caption" color="textSecondary">
            {v.address}
          </AppText>
        ) : null}
        {v.phone ? (
          <AppText variant="caption" color="textSecondary">
            {v.phone}
          </AppText>
        ) : null}
        <AppText variant="body" color="primary">
          열린 조인 {v.openJoinCount}
        </AppText>
        {v.joinPreviews.length === 0 ? (
          <AppText variant="caption" color="textSecondary">
            현재 열린 조인 없음
          </AppText>
        ) : (
          v.joinPreviews.map((j) => (
            <Pressable key={j.joinId} style={styles.card} onPress={() => props.onJoinPress(j.joinId)}>
              <AppText variant="body">
                {j.startAt} · {j.currentParticipants}/{j.maxParticipants}명
              </AppText>
              <AppText variant="caption" color="textSecondary">
                Reward {j.rewardCoin} Coin · 방장 {j.hostNickname}
                {j.hostVerified ? ' ✓' : ''}
              </AppText>
            </Pressable>
          ))
        )}
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
          <AppText variant="caption" color="textSecondary">
            {v.source === 'GOLF_FACILITY'
              ? '위치 정보 확인 중인 시설입니다.'
              : '이 장소에서 조인 만들기는 곧 지원됩니다.'}
          </AppText>
        )}
      </View>
    );
  }

  if (props.mode === 'USER' && props.selectedUser) {
    const u = props.selectedUser;
    return (
      <View style={styles.block}>
        <AppText variant="subtitle">
          {u.nickname}
          {u.verifiedBadge ? ' ✓' : ''}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {u.ageBand ?? '나이대 비공개'} · {u.skillLevel ?? '실력 미설정'}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          약 {(u.approxDistanceMeters / 1000).toFixed(1)}km · {u.regionLabel ?? '주변'}
        </AppText>
        <AppText variant="body" color="primary">
          지금 조인 가능
        </AppText>
        <AppText variant="caption" color="textSecondary">
          정확한 위치는 공개되지 않습니다.
        </AppText>
        <Button label="프로필 보기" onPress={props.onOpenProfile} />
      </View>
    );
  }

  // PEEK
  return (
    <View style={styles.block}>
      <AppText variant="subtitle">내 주변</AppText>
      <AppText variant="caption" color="textSecondary">
        스크린골프장 {props.venues.length}곳 · 지금 조인 가능 {props.users.length}명
      </AppText>
      <Pressable style={styles.presence} onPress={props.onOpenPresence}>
        <AppText variant="body" color="primary">
          지금 조인 가능
        </AppText>
        <AppText variant="body" color="textSecondary">
          {props.presence === 'AVAILABLE' ? 'ON' : 'OFF'}
        </AppText>
      </Pressable>
      {props.venues.slice(0, 2).map((v, idx) => (
        <Pressable
          key={v.venueId}
          style={[styles.card, idx === 1 && styles.cardPeek]}
          onPress={() => props.onSelectVenue(v.venueId)}
        >
          <AppText variant="body">⛳ {v.name}</AppText>
          <AppText variant="caption" color="textSecondary">
            {v.distanceMeters != null ? `${(v.distanceMeters / 1000).toFixed(1)}km · ` : ''}
            {v.regionLabel ?? ''}
            {` · 열린 조인 ${v.openJoinCount}`}
          </AppText>
        </Pressable>
      ))}
      {props.users.slice(0, 1).map((u) => (
        <Pressable key={u.userId} style={styles.card} onPress={() => props.onSelectUser(u.userId)}>
          <AppText variant="body">
            👤 {u.nickname}
            {u.verifiedBadge ? ' ✓' : ''}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            약 {(u.approxDistanceMeters / 1000).toFixed(1)}km · 지금 조인 가능
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm, paddingBottom: spacing.md },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    gap: 4,
    minHeight: 64,
  },
  cardPeek: {
    opacity: 0.85,
  },
  presence: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  row: { gap: spacing.sm },
});
