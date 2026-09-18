import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@jjoin/design-system';

export type ProfileGallerySlide = {
  id: string;
  imageUrl: string;
};

type Props = {
  visible: boolean;
  slides: ProfileGallerySlide[];
  initialIndex: number;
  onClose: () => void;
};

export function ProfileGallerySliderModal({
  visible,
  slides,
  initialIndex,
  onClose,
}: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ProfileGallerySlide>>(null);
  const [index, setIndex] = useState(0);
  const viewableSlides = useMemo(
    () => slides.filter((slide) => Boolean(slide.imageUrl?.trim())),
    [slides],
  );

  useEffect(() => {
    if (!visible || viewableSlides.length === 0) {
      return;
    }
    const safeIndex = Math.min(Math.max(initialIndex, 0), viewableSlides.length - 1);
    setIndex(safeIndex);
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: safeIndex, animated: false });
    });
  }, [visible, initialIndex, viewableSlides]);

  if (viewableSlides.length === 0) {
    return null;
  }

  function onMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1));
    setIndex(next);
  }

  const imageHeight = Math.max(height * 0.65, 240);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="닫기"
          onPress={onClose}
        />
        <View style={[styles.header, { paddingTop: insets.top + 8, paddingHorizontal: 16 }]}>
          <Text variant="bodyStrong" tone="inverse">
            {index + 1} / {viewableSlides.length}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="닫기"
            hitSlop={12}
            onPress={onClose}
          >
            <Text variant="bodyStrong" tone="inverse">닫기</Text>
          </Pressable>
        </View>
        <FlatList
          ref={listRef}
          data={viewableSlides}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={Math.min(Math.max(initialIndex, 0), viewableSlides.length - 1)}
          getItemLayout={(_, itemIndex) => ({
            length: width,
            offset: width * itemIndex,
            index: itemIndex,
          })}
          onScrollToIndexFailed={() => {
            listRef.current?.scrollToOffset({ offset: width * index, animated: false });
          }}
          onMomentumScrollEnd={onMomentumEnd}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width, height: imageHeight }]}>
              <Image
                source={{ uri: item.imageUrl }}
                style={[styles.image, { width, height: imageHeight }]}
                resizeMode="contain"
              />
            </View>
          )}
        />
        <Text variant="caption" tone="inverse" style={styles.hint}>
          좌우로 밀어 다른 사진을 볼 수 있습니다
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slide: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    backgroundColor: 'transparent',
  },
  hint: {
    textAlign: 'center',
    paddingBottom: 24,
    opacity: 0.8,
  },
});
