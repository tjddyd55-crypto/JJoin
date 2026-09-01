import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Stack, Text } from '@jjoin/design-system';
import { isInternalToolsEnabled } from '../../../lib/internal-tools';
import { ClubPlaceholderImage } from './ClubPlaceholderImage';

type Props = {
  coverImageUrl: string | null;
  uploading: boolean;
  onPick: (localUri: string) => void;
  onClear: () => void;
};

export function ClubCoverPicker({ coverImageUrl, uploading, onPick, onClear }: Props) {
  const [error, setError] = useState<string | null>(null);

  const pickSample = () => {
    setError(null);
    onPick(`https://picsum.photos/seed/club-${Date.now()}/800/400`);
  };

  return (
    <Stack gap="sm">
      <ClubPlaceholderImage uri={coverImageUrl} height={180} />
      <View style={styles.actions}>
        {isInternalToolsEnabled() ? (
          <Button
            label={uploading ? '업로드 중…' : '사진 선택 (DEV)'}
            variant="secondary"
            size="sm"
            loading={uploading}
            onPress={pickSample}
          />
        ) : (
          <Text variant="caption" tone="tertiary">
            대표사진은 선택 사항입니다. 없으면 기본 이미지가 표시됩니다.
          </Text>
        )}
        {coverImageUrl ? (
          <Button label="사진 제거" variant="secondary" size="sm" onPress={onClear} />
        ) : null}
      </View>
      {error ? <Text tone="error">{error}</Text> : null}
    </Stack>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
