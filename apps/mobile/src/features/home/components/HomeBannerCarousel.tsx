import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
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

/**
 * Page width MUST be the carousel container width (inside ScrollScreenFrame padding),
 * not window width. Using window width makes each page wider than the list viewport,
 * so cards look left-shifted with a large empty gap on the right.
 */
export function HomeBannerCarousel({ banners }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const listRef = useRef<FlatList<HomeBannerDto>>(null);
  const [index, setIndex] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);

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
    if (slides.length < 2 || pageWidth <= 0) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % slides.length;
        listRef.current?.scrollToOffset({ offset: next * pageWidth, animated: true });
        return next;
      });
    }, HOME_BANNER_AUTO_SLIDE_MS);
    return () => clearInterval(timer);
  }, [slides.length, pageWidth]);

  function onContainerLayout(event: LayoutChangeEvent) {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next <= 0 || next === pageWidth) return;
    setPageWidth(next);
    // Re-align current page after width changes (rotation / first measure).
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: index * next, animated: false });
    });
  }

  function onMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (pageWidth <= 0) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    const clamped = Math.max(0, Math.min(slides.length - 1, next));
    setIndex(clamped);
  }

  return (
    <View onLayout={onContainerLayout} style={styles.container}>
      {pageWidth > 0 ? (
        <FlatList
          ref={listRef}
          data={slides}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          getItemLayout={(_, itemIndex) => ({
            length: pageWidth,
            offset: pageWidth * itemIndex,
            index: itemIndex,
          })}
          snapToInterval={pageWidth}
          snapToAlignment="start"
          disableIntervalMomentum
          decelerationRate="fast"
          bounces={false}
          style={{ width: pageWidth }}
          renderItem={({ item }) => (
            <Pressable
              style={{ width: pageWidth }}
              onPress={() => {
                if (item.href?.startsWith('/')) router.push(item.href as Href);
              }}
            >
              {/* No extra horizontal inset: parent ScrollScreenFrame already pads. */}
              <HomeHeroBanner
                title={item.title}
                subtitle={item.subtitle ?? undefined}
                imageUrl={item.imageUrl}
              />
            </Pressable>
          )}
        />
      ) : (
        <View style={styles.placeholder} />
      )}
      {slides.length > 1 ? (
        <View style={styles.dots}>
          {slides.map((slide, slideIndex) => (
            <View
              key={slide.id}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    slideIndex === index
                      ? theme.colors.action.primary
                      : theme.colors.border.subtle,
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
  container: {
    width: '100%',
  },
  placeholder: {
    height: 160,
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
