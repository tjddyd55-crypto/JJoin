import { Dimensions, StyleSheet, View } from 'react-native';
import { Button, ClubCover, Stack, Text } from '@jjoin/design-system';
import { isInternalToolsEnabled } from '../../../lib/internal-tools';

type Props = {
  coverImageUrl: string | null;
  uploading: boolean;
  clubId?: string;
  onPick: (localUri: string) => void;
  onClear: () => void;
};

export function ClubCoverPicker({ coverImageUrl, uploading, clubId, onPick, onClear }: Props) {
  const heroWidth = Dimensions.get('window').width - 32;
  const fallbackTone = clubId && clubId.length % 2 === 0 ? 'blue' : 'green';

  const pickSample = () => {
    onPick(`https://picsum.photos/seed/club-${Date.now()}/800/400`);
  };

  return (
    <Stack gap="sm">
      <ClubCover
        uri={coverImageUrl}
        variant="hero"
        heroWidth={heroWidth}
        fallbackTone={fallbackTone}
        imageStyle={styles.hero}
      />
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
          <Text variant="clubMeta" tone="tertiary">
            대표사진은 선택 사항입니다. 없으면 쪼인존 기본 커버가 표시됩니다.
          </Text>
        )}
        {coverImageUrl ? (
          <Button label="사진 제거" variant="secondary" size="sm" onPress={onClear} />
        ) : null}
      </View>
    </Stack>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignSelf: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
