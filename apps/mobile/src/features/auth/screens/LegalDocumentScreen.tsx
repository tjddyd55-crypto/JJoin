import { StyleSheet, View } from 'react-native';
import {
  Button,
  FormScreenFrame,
  StickyActionFrame,
  Text,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LEGAL_DOCUMENTS, type LegalDocId } from '../legal';

function isLegalDocId(value: string | undefined): value is LegalDocId {
  return Boolean(value && value in LEGAL_DOCUMENTS);
}

export function LegalDocumentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ doc?: string }>();
  const docId = isLegalDocId(params.doc) ? params.doc : 'tos';
  const doc = LEGAL_DOCUMENTS[docId];

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
          {t(doc.bodyKey)}
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
