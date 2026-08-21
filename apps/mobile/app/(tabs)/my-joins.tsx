import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, colors, spacing } from '@jjoin/design-system';
import { t } from '@jjoin/i18n';

export default function MyJoinsScreen() {
  return (
    <View style={styles.root}>
      <AppText variant="subtitle">{t('nav.myJoins')}</AppText>
      <AppText variant="body" color="textSecondary">
        Hosted / Participating lists — next slice
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.sm },
});
