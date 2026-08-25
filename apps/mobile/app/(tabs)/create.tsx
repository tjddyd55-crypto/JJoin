import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  AppText,
  BottomActionBar,
  Button,
  Chip,
  ScreenContainer,
  ScreenHeader,
  Stack,
  SurfaceCard,
  colors,
  spacing,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { JoinMethod, SCREEN_GOLF_CODE, type JoinCoinPreviewDto } from '@jjoin/types';
import { useSession } from '../../src/session/SessionContext';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore } from '../../src/session/SessionContext';
import { JoinCreateVenueSection } from '../../src/features/join-create/components/JoinCreateVenueSection';
import {
  clearJoinCreateDraft,
  peekJoinCreateDraft,
  saveJoinCreateDraft,
} from '../../src/features/join-create/model/join-create-draft';
import {
  type JoinCreateVenueSelection,
  venueSelectionFromVenueDto,
  venueSelectionHasPlace,
} from '../../src/features/join-create/model/join-create-venue';

function defaultStartAtIso() {
  const d = new Date(Date.now() + 2 * 60 * 60_000);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

function newIdempotencyKey() {
  return `create-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function CreateScreen() {
  const { requestGatedAction, me } = useSession();
  const router = useRouter();
  const params = useLocalSearchParams<{
    venueId?: string;
    venueName?: string;
    venueAddress?: string;
  }>();
  const routeVenueId = typeof params.venueId === 'string' ? params.venueId : undefined;
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);

  const [selectedVenue, setSelectedVenue] = useState<JoinCreateVenueSelection | null>(null);
  const [players, setPlayers] = useState(4);
  const [preview, setPreview] = useState<JoinCoinPreviewDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneJoinId, setDoneJoinId] = useState<string | null>(null);
  const [resolvingRouteVenue, setResolvingRouteVenue] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const draft = peekJoinCreateDraft();
      if (draft) {
        setPlayers(draft.players);
        if (draft.selectedVenue && !routeVenueId) {
          setSelectedVenue(draft.selectedVenue);
        }
        clearJoinCreateDraft();
      }
    }, [routeVenueId]),
  );

  useEffect(() => {
    if (!routeVenueId) return;
    let cancelled = false;
    setResolvingRouteVenue(true);
    void (async () => {
      try {
        const v = await api.getVenue(routeVenueId);
        if (cancelled) return;
        setSelectedVenue(
          venueSelectionFromVenueDto({
            venueId: v.venueId,
            name: typeof params.venueName === 'string' ? params.venueName : v.name,
            address: v.address,
            roadAddress:
              typeof params.venueAddress === 'string' ? params.venueAddress : v.roadAddress,
            phone: null,
            latitude: v.latitude,
            longitude: v.longitude,
          }),
        );
      } catch {
        if (!cancelled) {
          setError('선택한 장소 정보를 불러올 수 없습니다.');
        }
      } finally {
        if (!cancelled) setResolvingRouteVenue(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, params.venueAddress, params.venueName, routeVenueId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await api.previewJoinCoin({ plannedPlayerCount: players });
        if (!cancelled) setPreview(next);
      } catch {
        if (!cancelled) setPreview(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, players, me?.userId]);

  const onPickFromMap = useCallback(() => {
    saveJoinCreateDraft({ players, selectedVenue });
    router.push({
      pathname: '/(tabs)/explore',
      params: { venuePick: '1' },
    } as Href);
  }, [players, router, selectedVenue]);

  const canSubmit = venueSelectionHasPlace(selectedVenue) && !submitting && !resolvingRouteVenue;

  const onCreate = useCallback(async () => {
    const gate = requestGatedAction({ type: 'CREATE_JOIN' });
    if (!gate.allowed) {
      router.push('/auth/gate');
      return;
    }
    if (submitting || !venueSelectionHasPlace(selectedVenue)) {
      setError('장소를 먼저 선택해주세요.');
      return;
    }
    if (preview && !preview.canCreate) {
      setError(t('create.coin.insufficient'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const detail = await api.createJoin({
        sportCode: SCREEN_GOLF_CODE,
        venueId: selectedVenue.venueId,
        startAt: defaultStartAtIso(),
        plannedPlayerCount: players,
        joinMethod: JoinMethod.APPROVAL,
        title: `${selectedVenue.name} 스크린골프`,
        idempotencyKey: newIdempotencyKey(),
      });
      setDoneJoinId(detail.joinId);
      clearJoinCreateDraft();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'create_failed';
      if (msg.startsWith('network_error')) setError('네트워크 오류 — API 연결을 확인하세요.');
      else if (msg.includes('401')) setError('로그인이 필요합니다.');
      else if (msg.includes('INSUFFICIENT_BALANCE')) setError(t('create.coin.insufficient'));
      else setError('조인 생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }, [api, players, preview, requestGatedAction, router, selectedVenue, submitting]);

  if (doneJoinId) {
    return (
      <ScreenContainer padded={false}>
        <ScreenHeader title="조인 생성 완료" />
        <Stack gap="md" style={styles.body}>
          <AppText variant="body" color="textSecondary">
            방 생성 수수료와 참가 보상 보류가 Ledger에 기록되었습니다.
          </AppText>
          <Button
            label="조인 상세"
            onPress={() =>
              router.push({ pathname: '/join/[joinId]', params: { joinId: doneJoinId } } as Href)
            }
          />
          <Button
            label="내 조인"
            variant="secondary"
            onPress={() => router.push('/(tabs)/my-joins')}
          />
          <Button label="월렛" variant="secondary" onPress={() => router.push('/my/wallet')} />
        </Stack>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false}>
      <ScreenHeader title="조인 만들기" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AppText variant="caption" color="textSecondary" style={styles.host}>
          {me?.publicProfile?.nickname
            ? `호스트: ${me.publicProfile.nickname}`
            : '로그인 후 조인을 만들 수 있습니다'}
        </AppText>

        <JoinCreateVenueSection
          api={api}
          selected={selectedVenue}
          onChange={setSelectedVenue}
          onPickFromMap={onPickFromMap}
        />

        <AppText variant="bodyStrong" style={styles.fieldLabel}>
          인원 {players}명
        </AppText>
        <View style={styles.chipRow}>
          {[2, 3, 4].map((n) => (
            <Chip
              key={n}
              label={`${n}명`}
              selected={players === n}
              onPress={() => setPlayers(n)}
            />
          ))}
        </View>

        <AppText variant="bodyStrong" style={styles.fieldLabel}>
          코인 요약 (서버 계산)
        </AppText>
        {preview ? (
          <SurfaceCard>
            <SummaryRow label={t('create.coin.fee')} value={`${preview.roomCreationFee} Coin`} />
            <SummaryRow
              label={t('create.coin.reward')}
              value={`${preview.rewardPerParticipant} Coin × ${preview.rewardEligibleSlots}명`}
            />
            <SummaryRow label={t('create.coin.hold')} value={`${preview.rewardHoldTotal} Coin`} />
            <SummaryRow
              label={t('create.coin.total')}
              value={`${preview.totalRequiredCoin} Coin`}
              highlight
            />
            <SummaryRow
              label={t('create.coin.available')}
              value={`${preview.walletAvailable} Coin`}
            />
          </SurfaceCard>
        ) : (
          <AppText variant="caption" color="textSecondary">
            코인 preview 로딩 중…
          </AppText>
        )}

        <AppText variant="caption" color="textSecondary" style={styles.policy}>
          참가 방식: 승인제 · 수수료와 보상 보류는 별도 회계 (TEST ONLY / POLICY_TBD)
        </AppText>

        {!venueSelectionHasPlace(selectedVenue) ? (
          <AppText variant="caption" color="textSecondary">
            장소를 먼저 선택해주세요.
          </AppText>
        ) : null}

        {error ? (
          <AppText variant="body" color="danger">
            {error}
          </AppText>
        ) : null}
      </ScrollView>

      <BottomActionBar>
        <Button
          label="조인 생성"
          loading={submitting}
          disabled={!canSubmit}
          onPress={() => void onCreate()}
        />
      </BottomActionBar>
    </ScreenContainer>
  );
}

function SummaryRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
      <AppText variant="bodyStrong" color={highlight ? 'primary' : 'textPrimary'}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.lg,
    paddingBottom: spacing.lg,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  host: {
    marginTop: spacing.xs,
  },
  fieldLabel: {
    fontSize: 15,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xxs,
  },
  policy: {
    marginTop: spacing.xs,
  },
});
