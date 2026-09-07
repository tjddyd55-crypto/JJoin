import { useCallback, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';
import { spacing } from '../../tokens';

export type AgeRangeSelectorValue = {
  minAge: number | null;
  maxAge: number | null;
};

export type AgeRangeSelectorProps = {
  minBound: number;
  maxBound: number;
  value: AgeRangeSelectorValue;
  onChange: (next: AgeRangeSelectorValue) => void;
  unrestrictedLabel?: string;
  style?: ViewStyle;
};

const HANDLE_VISUAL = 24;
const HANDLE_TOUCH = 44;

function clampAge(age: number, minBound: number, maxBound: number): number {
  return Math.min(maxBound, Math.max(minBound, age));
}

function ratioForAge(age: number, minBound: number, maxBound: number): number {
  if (maxBound <= minBound) return 0;
  return (clampAge(age, minBound, maxBound) - minBound) / (maxBound - minBound);
}

function ageForRatio(ratio: number, minBound: number, maxBound: number): number {
  const clamped = Math.max(0, Math.min(1, ratio));
  return Math.round(minBound + clamped * (maxBound - minBound));
}

function formatLabel(minAge: number | null, maxAge: number | null): string {
  if (minAge != null && maxAge != null) return `${minAge}세 ~ ${maxAge}세`;
  if (minAge != null) return `${minAge}세 이상`;
  if (maxAge != null) return `${maxAge}세 이하`;
  return '연령 무관';
}

const PAN_HANDLERS = {
  onStartShouldSetPanResponder: () => true,
  onStartShouldSetPanResponderCapture: () => true,
  onMoveShouldSetPanResponder: () => true,
  onMoveShouldSetPanResponderCapture: () => true,
  onPanResponderTerminationRequest: () => false,
  onShouldBlockNativeResponder: () => true,
};

export function AgeRangeSelector({
  minBound,
  maxBound,
  value,
  onChange,
  unrestrictedLabel = '연령 제한 없음',
  style,
}: AgeRangeSelectorProps) {
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const dragStartX = useRef(0);

  const valueRef = useRef(value);
  valueRef.current = value;
  const trackWidthRef = useRef(trackWidth);
  trackWidthRef.current = trackWidth;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const boundsRef = useRef({ minBound, maxBound });
  boundsRef.current = { minBound, maxBound };

  const applyDrag = useCallback((which: 'min' | 'max', x: number) => {
    const width = trackWidthRef.current;
    if (width <= 0) return;

    const { minBound: minB, maxBound: maxB } = boundsRef.current;
    const current = valueRef.current;
    const ratio = Math.max(0, Math.min(1, x / width));
    const age = ageForRatio(ratio, minB, maxB);
    const effectiveMin = current.minAge ?? minB;
    const effectiveMax = current.maxAge ?? maxB;

    if (which === 'min') {
      onChangeRef.current({
        minAge: Math.min(age, effectiveMax),
        maxAge: effectiveMax,
      });
      return;
    }

    onChangeRef.current({
      minAge: effectiveMin,
      maxAge: Math.max(age, effectiveMin),
    });
  }, []);

  const minResponder = useRef(
    PanResponder.create({
      ...PAN_HANDLERS,
      onPanResponderGrant: () => {
        const { minBound: minB, maxBound: maxB } = boundsRef.current;
        const current = valueRef.current;
        const age = current.minAge ?? minB;
        dragStartX.current = ratioForAge(age, minB, maxB) * trackWidthRef.current;
      },
      onPanResponderMove: (_, gesture) => {
        applyDrag('min', dragStartX.current + gesture.dx);
      },
    }),
  ).current;

  const maxResponder = useRef(
    PanResponder.create({
      ...PAN_HANDLERS,
      onPanResponderGrant: () => {
        const { minBound: minB, maxBound: maxB } = boundsRef.current;
        const current = valueRef.current;
        const age = current.maxAge ?? maxB;
        dragStartX.current = ratioForAge(age, minB, maxB) * trackWidthRef.current;
      },
      onPanResponderMove: (_, gesture) => {
        applyDrag('max', dragStartX.current + gesture.dx);
      },
    }),
  ).current;

  const onTrackLayout = useCallback((event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  }, []);

  const unrestricted = value.minAge == null && value.maxAge == null;
  const effectiveMin = value.minAge ?? minBound;
  const effectiveMax = value.maxAge ?? maxBound;

  const minLeft =
    trackWidth > 0 ? ratioForAge(effectiveMin, minBound, maxBound) * trackWidth : 0;
  const maxLeft =
    trackWidth > 0 ? ratioForAge(effectiveMax, minBound, maxBound) * trackWidth : trackWidth;
  const selectedWidth = Math.max(0, maxLeft - minLeft);

  const enableRange = () => {
    if (!unrestricted) return;
    onChange({ minAge: 35, maxAge: 49 });
  };

  const setUnrestricted = () => onChange({ minAge: null, maxAge: null });

  return (
    <View style={[styles.root, style]}>
      <View style={styles.labelRow}>
        <Text variant="bodyStrong" tone="primary">
          {unrestricted ? formatLabel(null, null) : formatLabel(effectiveMin, effectiveMax)}
        </Text>
      </View>

      <View style={styles.edgeLabels}>
        <Text variant="caption" tone="tertiary">{minBound}세</Text>
        <Text variant="caption" tone="tertiary">{maxBound}세</Text>
      </View>

      <View style={styles.trackPressable}>
        <View onLayout={onTrackLayout} style={styles.trackOuter}>
          <View
            style={[
              styles.track,
              { backgroundColor: theme.colors.border.subtle },
            ]}
          />

          {!unrestricted ? (
            <View
              pointerEvents="none"
              style={[
                styles.selectedTrack,
                {
                  left: minLeft,
                  width: selectedWidth,
                  backgroundColor: theme.colors.state.active,
                },
              ]}
            />
          ) : null}

          {unrestricted ? (
            <Pressable
              accessibilityRole="adjustable"
              accessibilityLabel="연령 범위"
              onPress={enableRange}
              style={styles.trackTouchZone}
            />
          ) : (
            <>
              <View
                style={[
                  styles.handleTouch,
                  { left: minLeft - HANDLE_TOUCH / 2, zIndex: 2 },
                ]}
                {...minResponder.panHandlers}
              >
                <View
                  style={[
                    styles.handle,
                    {
                      borderColor: theme.colors.state.active,
                      backgroundColor: theme.colors.surface.base,
                    },
                  ]}
                />
              </View>
              <View
                style={[
                  styles.handleTouch,
                  { left: maxLeft - HANDLE_TOUCH / 2, zIndex: 2 },
                ]}
                {...maxResponder.panHandlers}
              >
                <View
                  style={[
                    styles.handle,
                    {
                      borderColor: theme.colors.state.active,
                      backgroundColor: theme.colors.surface.base,
                    },
                  ]}
                />
              </View>
            </>
          )}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: unrestricted }}
        onPress={setUnrestricted}
        style={styles.unrestrictedBtn}
      >
        <Text variant="caption" tone={unrestricted ? 'primary' : 'tertiary'}>
          {unrestrictedLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
  },
  labelRow: {
    minHeight: 24,
  },
  edgeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trackPressable: {
    paddingVertical: spacing.xs,
  },
  trackOuter: {
    height: HANDLE_TOUCH,
    justifyContent: 'center',
  },
  trackTouchZone: {
    ...StyleSheet.absoluteFill,
  },
  track: {
    height: 4,
    borderRadius: 2,
    width: '100%',
  },
  selectedTrack: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    top: (HANDLE_TOUCH - 4) / 2,
  },
  handleTouch: {
    position: 'absolute',
    width: HANDLE_TOUCH,
    height: HANDLE_TOUCH,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: HANDLE_VISUAL,
    height: HANDLE_VISUAL,
    borderRadius: HANDLE_VISUAL / 2,
    borderWidth: 2,
  },
  unrestrictedBtn: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
});
