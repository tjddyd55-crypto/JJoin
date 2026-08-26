import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  Chip,
  FormScreenFrame,
  Input,
  ScrollScreenFrame,
  Section,
  Spacer,
  StickyActionFrame,
  Text,
  useTheme,
} from '@jjoin/design-system';
import {
  StoreOwnerRelation,
  StoreVerificationStatus,
  type CreateStoreOwnershipRequest,
  type GolfFacilityMapDto,
  type StoreOwnershipRequestDto,
} from '@jjoin/types';
import { createStoreOwnershipRequestSchema } from '@jjoin/validation';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import {
  RELATION_LABELS,
  VERIFICATION_STATUS_LABELS,
  canSubmitStoreVerification,
} from '../store-ui';

const RELATION_OPTIONS = [
  StoreOwnerRelation.REPRESENTATIVE,
  StoreOwnerRelation.OWNER,
  StoreOwnerRelation.MANAGER,
  StoreOwnerRelation.OTHER,
] as const;

function latestRequest(requests: StoreOwnershipRequestDto[]): StoreOwnershipRequestDto | null {
  if (requests.length === 0) return null;
  return [...requests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0]!;
}

export function StoreVerificationScreen() {
  const router = useRouter();
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);

  const [requests, setRequests] = useState<StoreOwnershipRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchHits, setSearchHits] = useState<GolfFacilityMapDto[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<GolfFacilityMapDto | null>(null);

  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [relation, setRelation] = useState<StoreOwnerRelation>(StoreOwnerRelation.OWNER);
  const [memo, setMemo] = useState('');
  const [businessRegistrationNo, setBusinessRegistrationNo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const current = useMemo(() => latestRequest(requests), [requests]);
  const showForm = canSubmitStoreVerification(current?.status ?? null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await api.getMyStoreVerifications();
      setRequests(items);
      setError(null);
    } catch {
      setError('인증 요청 내역을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const runSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (q.length < 1) return;
    setSearchLoading(true);
    setFormError(null);
    try {
      const result = await api.searchGolfFacilities({ q, limit: 30 });
      setSearchHits(result.items);
    } catch {
      setSearchHits([]);
      setFormError('시설 검색에 실패했습니다.');
    } finally {
      setSearchLoading(false);
    }
  }, [api, searchQuery]);

  async function onSubmit() {
    if (!selectedFacility) {
      setFormError('매장을 검색해서 선택해 주세요.');
      return;
    }
    const parsed = createStoreOwnershipRequestSchema.safeParse({
      golfFacilityId: selectedFacility.id,
      applicantName,
      applicantPhone,
      relation,
      memo: memo.trim() || undefined,
      businessRegistrationNo: businessRegistrationNo.trim() || undefined,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? '입력값을 확인해 주세요.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await api.createStoreVerification(parsed.data as CreateStoreOwnershipRequest);
      await load();
      setSelectedFacility(null);
      setSearchQuery('');
      setSearchHits([]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setFormError(msg.includes('409') ? '이미 진행 중인 인증 요청이 있습니다.' : '제출에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <ScrollScreenFrame>
        <ActivityIndicator />
      </ScrollScreenFrame>
    );
  }

  if (!showForm) {
    return (
      <ScrollScreenFrame>
        <Text variant="screenTitle" tone="primary">
          스크린골프 매장 인증
        </Text>
        <Spacer size="md" />
        {error ? (
          <Text variant="body" tone="error">
            {error}
          </Text>
        ) : null}
        {current ? (
          <Card variant="elevated" padding="md">
            <Badge
              label={VERIFICATION_STATUS_LABELS[current.status]}
              variant={
                current.status === StoreVerificationStatus.APPROVED
                  ? 'success'
                  : current.status === StoreVerificationStatus.PENDING
                    ? 'warning'
                    : 'neutral'
              }
            />
            <Spacer size="sm" />
            <Text variant="bodyStrong" tone="primary">
              {current.facilityName}
            </Text>
            {current.facilityAddress ? (
              <Text variant="caption" tone="secondary">
                {current.facilityAddress}
              </Text>
            ) : null}
            <Text variant="caption" tone="tertiary">
              {RELATION_LABELS[current.relation]} · {current.applicantName} · {current.applicantPhone}
            </Text>
            {current.status === StoreVerificationStatus.REJECTED && current.rejectReason ? (
              <Text variant="body" tone="error" style={styles.rejectReason}>
                거절 사유: {current.rejectReason}
              </Text>
            ) : null}
            {current.status === StoreVerificationStatus.APPROVED ? (
              <>
                <Spacer size="md" />
                <Button
                  label="내 매장 보기"
                  onPress={() => router.push('/my/stores')}
                  fullWidth
                />
              </>
            ) : null}
          </Card>
        ) : null}
      </ScrollScreenFrame>
    );
  }

  return (
    <FormScreenFrame
      footer={
        <StickyActionFrame>
          <Button label="인증 요청 제출" loading={submitting} onPress={() => void onSubmit()} fullWidth />
        </StickyActionFrame>
      }
    >
      <Text variant="screenTitle" tone="primary">
        스크린골프 매장 인증
      </Text>
      <Spacer size="sm" />
      <Text variant="body" tone="secondary">
        스크린골프 매장을 운영하고 계신가요?
      </Text>
      {current ? (
        <>
          <Spacer size="sm" />
          <Card variant="base" padding="md">
            <Text variant="caption" tone="tertiary">
              이전 요청: {VERIFICATION_STATUS_LABELS[current.status]}
              {current.rejectReason ? ` · ${current.rejectReason}` : ''}
            </Text>
          </Card>
        </>
      ) : null}
      {error ? (
        <>
          <Spacer size="sm" />
          <Text variant="body" tone="error">
            {error}
          </Text>
        </>
      ) : null}

      <Spacer size="lg" />
      <Section title="매장 검색">
        <Input
          label="매장명 또는 주소"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="예) 강남 스크린골프"
          returnKeyType="search"
          onSubmitEditing={() => void runSearch()}
        />
        <Spacer size="sm" />
        <Button label="검색" variant="secondary" onPress={() => void runSearch()} loading={searchLoading} />
        {selectedFacility ? (
          <Card variant="elevated" padding="md" style={styles.selectedFacility}>
            <Text variant="bodyStrong" tone="primary">
              선택: {selectedFacility.displayName}
            </Text>
            {selectedFacility.roadAddress ? (
              <Text variant="caption" tone="secondary">
                {selectedFacility.roadAddress}
              </Text>
            ) : null}
          </Card>
        ) : null}
        {searchHits.map((facility) => (
          <Pressable
            key={facility.id}
            accessibilityRole="button"
            onPress={() => {
              setSelectedFacility(facility);
              setFormError(null);
            }}
            style={({ pressed }) => [
              styles.hitRow,
              {
                borderBottomColor: theme.colors.border.subtle,
                backgroundColor:
                  selectedFacility?.id === facility.id
                    ? theme.colors.surface.elevated
                    : 'transparent',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text variant="body" tone="primary">
              {facility.displayName}
            </Text>
            {facility.roadAddress ? (
              <Text variant="caption" tone="secondary">
                {facility.roadAddress}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </Section>

      <Spacer size="lg" />
      <Section title="신청 정보">
        <Input label="신청자 이름" value={applicantName} onChangeText={setApplicantName} />
        <Spacer size="sm" />
        <Input
          label="연락처"
          value={applicantPhone}
          onChangeText={setApplicantPhone}
          keyboardType="phone-pad"
        />
        <Spacer size="md" />
        <Text variant="meta" tone="secondary">
          매장과의 관계
        </Text>
        <View style={styles.chipRow}>
          {RELATION_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={RELATION_LABELS[option]}
              selected={relation === option}
              onPress={() => setRelation(option)}
            />
          ))}
        </View>
        <Spacer size="sm" />
        <Input
          label="메모 (선택)"
          value={memo}
          onChangeText={setMemo}
          multiline
          numberOfLines={3}
        />
        <Spacer size="sm" />
        <Input
          label="사업자등록번호 (선택)"
          value={businessRegistrationNo}
          onChangeText={setBusinessRegistrationNo}
        />
      </Section>

      {formError ? (
        <>
          <Spacer size="sm" />
          <Text variant="body" tone="error">
            {formError}
          </Text>
        </>
      ) : null}
    </FormScreenFrame>
  );
}

const styles = StyleSheet.create({
  hitRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  selectedFacility: {
    marginTop: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  rejectReason: {
    marginTop: 8,
  },
});
