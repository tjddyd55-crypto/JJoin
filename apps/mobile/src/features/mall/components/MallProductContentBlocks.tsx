import { Image, StyleSheet, Text as RNText, View } from 'react-native';
import { Text } from '@jjoin/design-system';
import { MallContentBlockType, type MallProductContentBlockDto } from '@jjoin/types';
import { mallColors, mallMetrics } from '../mallDesignTokens';

type Props = {
  blocks: MallProductContentBlockDto[];
};

export function MallProductContentBlocks({ blocks }: Props) {
  const ordered = [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);

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
    marginHorizontal: mallMetrics.screenPadding,
    marginTop: 20,
    gap: 16,
  },
  heading: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: '700',
    color: mallColors.textPrimary,
    lineHeight: 24,
  },
  text: {
    lineHeight: 22,
  },
  image: {
    width: '100%',
    aspectRatio: 1.2,
    borderRadius: mallMetrics.detailInfoRadius,
    backgroundColor: mallColors.surfaceMuted,
  },
  notice: {
    borderRadius: 16,
    backgroundColor: mallColors.accentGreenSoft,
    padding: 16,
  },
  noticeText: {
    fontSize: 13,
    color: mallColors.textPrimary,
    lineHeight: 20,
  },
});
