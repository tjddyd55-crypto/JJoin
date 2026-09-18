import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Text, useTheme } from '@jjoin/design-system';
import { HOME_BANNER_AUTO_SLIDE_MS } from '@jjoin/domain';
import type { HomeBannerDto } from '@jjoin/types';
import { HomeHeroBanner } from './HomeHeroBanner';

type Props = {
  banners: HomeBannerDto[];
};

export function HomeBannerCarousel({ banners }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<HomeBannerDto>>(null);
  const [index, setIndex] = useState(0);
  const slides = useMemo(
    () =>
      banners.length > 0
        ? banners
        : [
            {
              id: 'placeholder-1',
              title: '오늘도 좋은 사람들과 라운딩 어때요?',
              subtitle: '나와 잘 맞는 조인을 찾아보세요',
              imageUrl: null,
              href: null,
              sortOrder: 0,
              active: true,
              startsAt: null,
              endsAt: null,
            },
          ],
    [banners],
  );

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % slides.length;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, HOME_BANNER_AUTO_SLIDE_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  function onMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1));
    setIndex(next);
  }

  return (
    <View>
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          <Pressable
            style={{ width }}
            onPress={() => {
              if (item.href?.startsWith('/')) router.push(item.href as Href);
            }}
          >
            <View style={styles.slide}>
              <HomeHeroBanner title={item.title} subtitle={item.subtitle ?? undefined} />
            </View>
          </Pressable>
        )}
      />
      {slides.length > 1 ? (
        <View style={styles.dots}>
          {slides.map((slide, slideIndex) => (
            <View
              key={slide.id}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    slideIndex === index ? theme.colors.action.primary : theme.colors.border.subtle,
                },
              ]}
            />
          ))}
        </View>
      ) : null}
      {slides.length > 1 ? (
        <Text variant="meta" tone="secondary" style={styles.hint}>
          {index + 1}/{slides.length}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    paddingHorizontal: 16,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  hint: {
    textAlign: 'center',
    marginTop: 4,
  },
});
