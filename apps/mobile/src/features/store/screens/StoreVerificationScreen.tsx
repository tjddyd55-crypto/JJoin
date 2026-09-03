import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  Chip,
  FormScreenFrame,
  Input,
  Section,
  Spacer,
  StickyActionFrame,
  Text,
  useTheme,
} from '@jjoin/design-system';
import { formatKoreanPhoneDisplay, formatKoreanPhoneInput } from '@jjoin/domain';
import {
  StoreOwnerRelation,
  StoreVerificationStatus,
  type CreateStoreOwnershipRequest,
  type GolfFacilityMapDto,
  type StoreOwnershipDto,
  type StoreOwnershipRequestDto,
} from '@jjoin/types';
import { createStoreOwnershipRequestSchema } from '@jjoin/validation';
import {
  brandLabel,
  facilityTypeLabel,
} from '../../explore/api/golf-facility-explore';
import { getApiClient } from '../../../lib/api';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { formatFacilityRegion } from '../api/store-facility-search';
import { StoreFacilityFinderModal } from '../components/StoreFacilityFinderModal';
import {
  RELATION_LABELS,
  VERIFICATION_STATUS_LABELS,
  canSubmitStoreVerificationForFacility,
} from '../store-ui';

const RELATION_OPTIONS = [
  StoreOwnerRelation.REPRESENTATIVE,
  StoreOwnerRelation.OWNER,
  StoreOwnerRelation.MANAGER,
  StoreOwnerRelation.OTHER,
] as const;

function facilitySubtitle(facility: GolfFacilityMapDto): string {
  const brand = brandLabel(facility.primaryBrand);
  const typeLabel = facilityTypeLabel(facility.facilityType);
  const category = brand ? `${typeLabel} · ${brand}` : typeLabel;
  const region = formatFacilityRegion(facility);
  return [category, region].filter(Boolean).join(' · ');
}

function statusBadgeVariant(
  status: StoreVerificationStatus,
): 'success' | 'warning' | 'neutral' | 'error' {
  if (status === StoreVerificationStatus.APPROVED) return 'success';
  if (status === StoreVerificationStatus.PENDING) return 'warning';
  if (status === StoreVerificationStatus.REJECTED) return 'error';
  return 'neutral';
}

export function StoreVerificationScreen() {
  const router = useRouter();
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);

  const [requests, setRequests] = useState<StoreOwnershipRequestDto[]>([]);
  const [stores, setStores] = useState<StoreOwnershipDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [finderOpen, setFinderOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<GolfFacilityMapDto | null>(null);

  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [relation, setRelation] = useState<StoreOwnerRelation>(StoreOwnerRelation.OWNER);
  const [memo, setMemo] = useState('');
  const [businessRegistrationNo, setBusinessRegistrationNo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const ownershipFacilityIds = useMemo(
    () => stores.map((s) => s.golfFacilityId),
    [stores],
  );

  const canSubmitSelected = canSubmitStoreVerificationForFacility({
    golfFacilityId: selectedFacility?.id,
    requests,
    ownershipFacilityIds,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [items, storeItems] = await Promise.all([
        api.getMyStoreVerifications(),
        api.getMyStores(),
      ]);
      setRequests(items);
      setStores(storeItems);
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

  const onSelectFacility = useCallback((facility: GolfFacilityMapDto) => {
    setSelectedFacility(facility);
    setFormError(null);
  }, []);

  async function onSubmit() {
    if (!selectedFacility) {
      setFormError('먼저 매장을 선택해주세요.');
      return;
    }
    if (
      !canSubmitStoreVerificationForFacility({
        golfFacilityId: selectedFacility.id,
        requests,
        ownershipFacilityIds,
      })
    ) {
      setFormError('이미 승인되었거나 심사 중인 매장입니다. 다른 매장을 선택해 주세요.');
      return;
    }
    const parsed = createStoreOwnershipRequestSchema.safeParse({
      golfFacilityId: selectedFacility.id,
      applicantName,
      applicantPhone: formatKoreanPhoneDisplay(applicantPhone) || applicantPhone,
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
      setSelectedFacility(null);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('ACTIVE_OWNERSHIP') || msg.includes('이미 승인')) {
        setFormError('이미 승인된 매장입니다. 다른 매장을 선택해 주세요.');
      } else if (msg.includes('409') || msg.includes('PENDING')) {
        setFormError('이미 진행 중인 인증 요청이 있습니다.');
      } else {
        setFormError('제출에 실패했습니다.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <FormScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
        <ActivityIndicator color={theme.colors.action.primary} />
      </FormScreenFrame>
    );
  }

  return (
    <FormScreenFrame
      edges={[...NESTED_SCREEN_EDGES]}
      footer={
        <StickyActionFrame>
          <Button
            label="인증 요청 제출"
            loading={submitting}
            disabled={!canSubmitSelected || !selectedFacility}
            onPress={() => void onSubmit()}
            fullWidth
          />
        </StickyActionFrame>
      }
    >
      <Text variant="body" tone="secondary">
        여러 매장을 운영 중이라면 매장마다 인증을 추가할 수 있습니다.
      </Text>

      {error ? (
        <>
          <Spacer size="sm" />
          <Text variant="body" tone="error">
            {error}
          </Text>
        </>
      ) : null}

      {requests.length > 0 ? (
        <>
          <Spacer size="lg" />
          <Section title="내 인증 요청">
            {requests.map((req) => (
              <Card key={req.id} variant="base" padding="md" style={styles.requestCard}>
                <Badge
                  label={VERIFICATION_STATUS_LABELS[req.status]}
                  variant={statusBadgeVariant(req.status)}
                />
                <Spacer size="xs" />
                <Text variant="bodyStrong" tone="primary">
                  {req.facilityName}
                </Text>
                {req.facilityAddress ? (
                  <Text variant="caption" tone="secondary">
                    {req.facilityAddress}
                  </Text>
                ) : null}
                <Text variant="caption" tone="tertiary">
                  {RELATION_LABELS[req.relation]} · {req.applicantName} ·{' '}
                  {formatKoreanPhoneDisplay(req.applicantPhone)}
                </Text>
                {req.status === StoreVerificationStatus.REJECTED && req.rejectReason ? (
                  <Text variant="caption" tone="error">
                    거절 사유: {req.rejectReason}
                  </Text>
                ) : null}
              </Card>
            ))}
            <Spacer size="sm" />
            <Button
              label="내 매장 보기"
              variant="secondary"
              onPress={() => router.push('/my/stores')}
              fullWidth
            />
          </Section>
        </>
      ) : null}

      <Spacer size="lg" />
      <Section title="새 매장 인증">
        {selectedFacility ? (
          <Card variant="elevated" padding="md" style={styles.selectedFacility}>
            <Text variant="meta" tone="success">
              ✓ 선택한 매장
            </Text>
            <Spacer size="xs" />
            <Text variant="bodyStrong" tone="primary">
              {selectedFacility.displayName}
            </Text>
            {selectedFacility.roadAddress ? (
              <Text variant="caption" tone="secondary">
                {selectedFacility.roadAddress}
              </Text>
            ) : null}
            <Text variant="caption" tone="tertiary">
              {facilitySubtitle(selectedFacility)}
            </Text>
            {!canSubmitSelected ? (
              <>
                <Spacer size="sm" />
                <Text variant="caption" tone="error">
                  이미 승인되었거나 심사 중인 매장입니다.
                </Text>
              </>
            ) : null}
            <Spacer size="sm" />
            <Button
              label="변경"
              variant="ghost"
              fullWidth={false}
              onPress={() => setFinderOpen(true)}
            />
          </Card>
        ) : (
          <Button
            label="매장 찾기"
            variant="secondary"
            onPress={() => setFinderOpen(true)}
          />
        )}
        <Spacer size="sm" />
        <Text variant="caption" tone="tertiary">
          지역을 선택한 뒤 스크린골프 매장 목록에서 찾을 수 있습니다.
        </Text>
      </Section>

      <StoreFacilityFinderModal
        visible={finderOpen}
        api={api}
        onClose={() => setFinderOpen(false)}
        onSelect={onSelectFacility}
      />

      <Spacer size="lg" />
      <Section title="신청 정보">
        <Input label="신청자 이름" value={applicantName} onChangeText={setApplicantName} />
        <Spacer size="sm" />
        <Input
          label="연락처"
          value={applicantPhone}
          onChangeText={(text) => setApplicantPhone(formatKoreanPhoneInput(text))}
          keyboardType="phone-pad"
          placeholder="010-1234-5678"
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
  selectedFacility: {
    marginTop: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  requestCard: {
    marginBottom: 8,
  },
});
