import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  FormScreenFrame,
  StickyActionFrame,
  Text,
} from '@jjoin/design-system';
import { applyServiceOperatorTemplate, normalizeServiceOperatorProfile } from '@jjoin/domain';
import { t } from '@jjoin/i18n';
import type { PublicServiceOperatorProfileDto } from '@jjoin/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getApiClient } from '../../../lib/api';
import { createExpoSecureSessionStore } from '../../../session/expo-secure-session-store';
import { LEGAL_DOCUMENTS, type LegalDocId } from '../legal';

const store = createExpoSecureSessionStore();

function isLegalDocId(value: string | undefined): value is LegalDocId {
  return Boolean(value && value in LEGAL_DOCUMENTS);
}

function profileToValues(profile: PublicServiceOperatorProfileDto | null) {
  if (!profile) return normalizeServiceOperatorProfile({});
  return normalizeServiceOperatorProfile({
    businessName: profile.businessName,
    brandName: profile.brandName,
    representativeName: profile.representativeName,
    businessRegistrationNumber: profile.businessRegistrationNumber,
    ecommerceRegistrationNumber: profile.ecommerceRegistrationNumber,
    corporateRegistrationNumber: profile.corporateRegistrationNumber,
    businessAddress: profile.businessAddress,
    customerServicePhone: profile.customerServicePhone,
    customerServiceEmail: profile.customerServiceEmail,
    customerServiceHours: profile.customerServiceHours,
    privacyOfficerName: profile.privacyOfficerName,
    privacyOfficerTitle: profile.privacyOfficerTitle,
    privacyDepartment: profile.privacyDepartment,
    privacyEmail: profile.privacyEmail,
    privacyPhone: profile.privacyPhone,
    paymentInquiryPhone: profile.paymentInquiryPhone,
    paymentInquiryEmail: profile.paymentInquiryEmail,
  });
}

export function LegalDocumentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ doc?: string }>();
  const docId = isLegalDocId(params.doc) ? params.doc : 'tos';
  const doc = LEGAL_DOCUMENTS[docId];
  const [operatorProfile, setOperatorProfile] = useState<PublicServiceOperatorProfileDto | null>(
    null,
  );

  useEffect(() => {
    void getApiClient(store)
      .getPublicServiceOperatorProfile()
      .then(setOperatorProfile)
      .catch(() => setOperatorProfile(null));
  }, []);

  const body = useMemo(() => {
    const raw = t(doc.bodyKey);
    return applyServiceOperatorTemplate(raw, profileToValues(operatorProfile));
  }, [doc.bodyKey, operatorProfile]);

  return (
    <FormScreenFrame
      footer={
        <StickyActionFrame>
          <Button label={t('common.confirm')} variant="secondary" onPress={() => router.back()} />
        </StickyActionFrame>
      }
    >
      <View style={styles.body}>
        <Text variant="screenTitle" tone="primary">
          {t(doc.titleKey)}
        </Text>
        <Text variant="body" tone="secondary">
          {body}
        </Text>
      </View>
    </FormScreenFrame>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 16,
    paddingBottom: 24,
  },
});
