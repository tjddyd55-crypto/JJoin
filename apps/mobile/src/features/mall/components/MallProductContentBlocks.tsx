import { Image, StyleSheet, Text as RNText, View } from 'react-native';
import { Text } from '@jjoin/design-system';
import { MallContentBlockType, type MallProductContentBlockDto } from '@jjoin/types';
import { mallColors, mallMetrics } from '../mallDesignTokens';

type Props = {
  blocks: MallProductContentBlockDto[];
};

export function MallProductContentBlocks({ blocks }: Props) {
  const ordered = [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);
  if (ordered.length === 0) return null;

  return (
    <View style={styles.root}>
      {ordered.map((block) => {
        if (block.type === MallContentBlockType.HEADING) {
          return (
            <RNText key={block.id} style={styles.heading}>
              {block.text}
            </RNText>
          );
        }
        if (block.type === MallContentBlockType.TEXT) {
          return (
            <Text key={block.id} variant="body" tone="secondary" style={styles.text}>
              {block.text}
            </Text>
          );
        }
        if (block.type === MallContentBlockType.IMAGE && block.imageUrl) {
          return (
            <Image
              key={block.id}
              source={{ uri: block.imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          );
        }
        if (block.type === MallContentBlockType.NOTICE) {
          return (
            <View key={block.id} style={styles.notice}>
              <RNText style={styles.noticeText}>{block.text}</RNText>
            </View>
          );
        }
        return null;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
  heading: {
    fontSize: 17,
    fontWeight: '700',
    color: mallColors.textPrimary,
    lineHeight: 24,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  image: {
    width: '100%',
    aspectRatio: 1.2,
    marginVertical: 16,
    borderRadius: 14,
    backgroundColor: mallColors.surfaceMuted,
  },
  notice: {
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: mallColors.accentGreenSoft,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  noticeText: {
    fontSize: 14,
    color: mallColors.textPrimary,
    lineHeight: 20,
  },
});
