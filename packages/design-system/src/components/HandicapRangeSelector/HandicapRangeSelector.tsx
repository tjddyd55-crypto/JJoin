import { useCallback, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';
import { spacing } from '../../tokens';

export type HandicapRangeValue = {
  min: number;
  max: number;
};

export type HandicapRangeSelectorProps = {
  minBound: number;
  maxBound: number;
  value: HandicapRangeValue;
  onChange: (next: HandicapRangeValue) => void;
  title?: string;
  style?: ViewStyle;
};

const HANDLE_VISUAL = 24;
const HANDLE_TOUCH = 44;

const PAN_HANDLERS = {
  onStartShouldSetPanResponder: () => true,
  onStartShouldSetPanResponderCapture: () => true,
  onMoveShouldSetPanResponder: () => true,
  onMoveShouldSetPanResponderCapture: () => true,
  onPanResponderTerminationRequest: () => false,
  onShouldBlockNativeResponder: () => true,
};

function clamp(value: number, minBound: number, maxBound: number): number {
  return Math.min(maxBound, Math.max(minBound, value));
}

function ratioFor(value: number, minBound: number, maxBound: number): number {
  if (maxBound <= minBound) return 0;
  return (clamp(value, minBound, maxBound) - minBound) / (maxBound - minBound);
}

function valueForRatio(ratio: number, minBound: number, maxBound: number): number {
  const clamped = Math.max(0, Math.min(1, ratio));
  return Math.round(minBound + clamped * (maxBound - minBound));
}

export function HandicapRangeSelector({
  minBound,
  maxBound,
  value,
  onChange,
  title = '스크린 핸디',
  style,
}: HandicapRangeSelectorProps) {
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
    const nextValue = valueForRatio(ratio, minB, maxB);
    if (which === 'min') {
      onChangeRef.current({ min: Math.min(nextValue, current.max), max: current.max });
      return;
    }
    onChangeRef.current({ min: current.min, max: Math.max(nextValue, current.min) });
  }, []);

  const minResponder = useRef(
    PanResponder.create({
      ...PAN_HANDLERS,
      onPanResponderGrant: () => {
        const { minBound: minB, maxBound: maxB } = boundsRef.current;
        dragStartX.current = ratioFor(valueRef.current.min, minB, maxB) * trackWidthRef.current;
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
        dragStartX.current = ratioFor(valueRef.current.max, minB, maxB) * trackWidthRef.current;
      },
      onPanResponderMove: (_, gesture) => {
        applyDrag('max', dragStartX.current + gesture.dx);
      },
    }),
  ).current;

  const onTrackLayout = useCallback((event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  }, []);

  const minLeft = trackWidth > 0 ? ratioFor(value.min, minBound, maxBound) * trackWidth : 0;
  const maxLeft = trackWidth > 0 ? ratioFor(value.max, minBound, maxBound) * trackWidth : trackWidth;
  const selectedWidth = Math.max(0, maxLeft - minLeft);

  return (
    <View style={[styles.root, style]}>
      <Text variant="bodyStrong" tone="primary">{title}</Text>
      <Text variant="bodyStrong" tone="primary">{value.min} ~ {value.max}</Text>
      <View style={styles.edgeLabels}>
        <Text variant="caption" tone="tertiary">{minBound}</Text>
        <Text variant="caption" tone="tertiary">{maxBound}</Text>
      </View>
      <View style={styles.trackPressable}>
        <View onLayout={onTrackLayout} style={styles.trackOuter}>
          <View style={[styles.track, { backgroundColor: theme.colors.border.subtle }]} />
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
          <View
            style={[styles.handleTouch, { left: minLeft - HANDLE_TOUCH / 2, zIndex: 2 }]}
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
            style={[styles.handleTouch, { left: maxLeft - HANDLE_TOUCH / 2, zIndex: 2 }]}
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
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  edgeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  trackPressable: { paddingVertical: spacing.xs },
  trackOuter: { height: HANDLE_TOUCH, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, width: '100%' },
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
});
