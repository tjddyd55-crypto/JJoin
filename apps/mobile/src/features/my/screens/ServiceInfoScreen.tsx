import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Button,
  FormScreenFrame,
  StickyActionFrame,
  Text,
} from '@jjoin/design-system';
import { formatKoreanPhoneDisplay } from '@jjoin/domain';
import { t } from '@jjoin/i18n';
import type { PublicServiceOperatorProfileDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { createExpoSecureSessionStore } from '../../../session/expo-secure-session-store';
import { legalDocumentRoute } from '../../auth/legal';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

const store = createExpoSecureSessionStore();

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" tone="secondary">{label}</Text>
      <Text variant="body" tone="primary">{value}</Text>
    </View>
  );
}

export function ServiceInfoScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<PublicServiceOperatorProfileDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void getApiClient(store)
      .getPublicServiceOperatorProfile()
      .then((data) => {
        if (alive) setProfile(data);
      })
      .catch(() => {
        if (alive) setProfile(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const hasBusinessInfo =
    profile &&
    (profile.displayLines.length > 0 ||
      profile.businessName ||
      profile.brandName);

  return (
    <FormScreenFrame
      edges={[...NESTED_SCREEN_EDGES]}
      footer={
        <StickyActionFrame>
          <Button label={t('common.confirm')} variant="secondary" onPress={() => router.back()} />
        </StickyActionFrame>
      }
    >
      <Text variant="screenTitle" tone="primary">{t('my.serviceInfo')}</Text>
      {loading ? (
        <Text variant="body" tone="secondary">{t('common.loading')}</Text>
      ) : hasBusinessInfo ? (
        <View style={styles.section}>
          {profile.displayLines.map((line) => (
            <InfoRow key={`${line.label}-${line.value}`} label={line.label} value={line.value} />
          ))}
          {profile.customerServiceHours ? (
            <InfoRow label="운영시간" value={profile.customerServiceHours} />
          ) : null}
          {profile.paymentInquiryPhone || profile.paymentInquiryEmail ? (
            <InfoRow
              label="결제 문의"
              value={[profile.paymentInquiryPhone ? formatKoreanPhoneDisplay(profile.paymentInquiryPhone) : null, profile.paymentInquiryEmail]
                .filter(Boolean)
                .join(' · ')}
            />
          ) : null}
        </View>
      ) : (
        <Text variant="body" tone="secondary">{t('my.serviceInfo.empty')}</Text>
      )}
      <View style={styles.links}>
        <Text variant="label" tone="secondary">{t('my.serviceInfo.legal')}</Text>
        <Text variant="body" tone="primary" onPress={() => router.push(legalDocumentRoute('tos'))}>
          {t('my.terms')}
        </Text>
        <Text variant="body" tone="primary" onPress={() => router.push(legalDocumentRoute('privacy'))}>
          {t('my.privacy')}
        </Text>
      </View>
    </FormScreenFrame>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    marginTop: 16,
  },
  row: {
    gap: 4,
  },
  links: {
    gap: 8,
    marginTop: 24,
  },
});
