import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Rect, Line } from 'react-native-svg';
import { useTheme } from '../theme';
import type { IconName, IconSize, IconTone } from './iconTypes';

type Props = {
  name: IconName;
  size?: IconSize;
  tone?: IconTone;
  accessibilityLabel?: string;
};

const STROKE = 1.75;

/** Club Minimal outline glyphs — single Icon wrapper; screens never paste SVG. */
function IconGlyph({ name, color, pixelSize }: { name: IconName; color: string; pixelSize: number }) {
  const common = {
    stroke: color,
    strokeWidth: STROKE,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={pixelSize} height={pixelSize} viewBox="0 0 24 24">
      {renderPaths(name, color, common)}
    </Svg>
  );
}

function renderPaths(
  name: IconName,
  color: string,
  common: {
    stroke: string;
    strokeWidth: number;
    strokeLinecap: 'round';
    strokeLinejoin: 'round';
    fill: string;
  },
) {
  switch (name) {
    case 'home':
      return <Path {...common} d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" />;
    case 'map':
    case 'explore':
      return <Path {...common} d="M9 4l-5 2v14l5-2 6 2 5-2V4l-5 2-6-2zM9 4v14M15 6v14" />;
    case 'create':
      return (
        <>
          <Circle {...common} cx="12" cy="12" r="9" />
          <Path {...common} d="M12 8v8M8 12h8" />
        </>
      );
    case 'wallet':
      return (
        <>
          <Rect {...common} x="3" y="6" width="18" height="13" rx="2" />
          <Path {...common} d="M3 10h18" />
          <Circle cx="16" cy="14" r="1.25" fill={color} stroke="none" />
        </>
      );
    case 'profile':
      return (
        <>
          <Circle {...common} cx="12" cy="8" r="3.5" />
          <Path {...common} d="M5 19.5c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
        </>
      );
    case 'back':
      return <Path {...common} d="M15 6l-6 6 6 6" />;
    case 'close':
      return <Path {...common} d="M7 7l10 10M17 7L7 17" />;
    case 'search':
      return (
        <>
          <Circle {...common} cx="11" cy="11" r="6" />
          <Path {...common} d="M16 16l4 4" />
        </>
      );
    case 'filter':
      return <Path {...common} d="M4 6h16M7 12h10M10 18h4" />;
    case 'location':
    case 'venue':
      return (
        <>
          <Path {...common} d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
          <Circle {...common} cx="12" cy="10" r="2.5" />
        </>
      );
    case 'currentLocation':
      return (
        <>
          <Circle {...common} cx="12" cy="12" r="3" />
          <Circle {...common} cx="12" cy="12" r="8" />
          <Path {...common} d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" />
        </>
      );
    case 'golf':
      return (
        <>
          <Path {...common} d="M8 21V4l9 4.5L8 13" />
          <Path {...common} d="M5 21h10" />
        </>
      );
    case 'people':
      return (
        <>
          <Circle {...common} cx="9" cy="8" r="2.5" />
          <Circle {...common} cx="16" cy="9" r="2" />
          <Path {...common} d="M3.5 18.5c1.2-2.8 3.2-4 5.5-4s4.3 1.2 5.5 4" />
          <Path {...common} d="M14 14.5c1.4-.6 2.8-.4 4.2.7.8.7 1.4 1.7 1.8 3.3" />
        </>
      );
    case 'clock':
      return (
        <>
          <Circle {...common} cx="12" cy="12" r="8" />
          <Path {...common} d="M12 8v4.5l3 2" />
        </>
      );
    case 'calendar':
      return (
        <>
          <Rect {...common} x="4" y="5" width="16" height="15" rx="2" />
          <Path {...common} d="M8 3v4M16 3v4M4 10h16" />
        </>
      );
    case 'notification':
      return (
        <>
          <Path {...common} d="M6 16h12l-1.2-2.2V10a4.8 4.8 0 1 0-9.6 0v3.8L6 16z" />
          <Path {...common} d="M10 18a2 2 0 0 0 4 0" />
        </>
      );
    case 'chevronRight':
      return <Path {...common} d="M9 6l6 6-6 6" />;
    case 'chevronDown':
      return <Path {...common} d="M6 9l6 6 6-6" />;
    case 'chevronUp':
      return <Path {...common} d="M6 15l6-6 6 6" />;
    case 'plus':
      return <Path {...common} d="M12 6v12M6 12h12" />;
    case 'minus':
      return <Path {...common} d="M6 12h12" />;
    case 'coin':
      return (
        <>
          <Circle {...common} cx="12" cy="12" r="8" />
          <Path {...common} d="M12 8v8M9.5 10.5c.6-1 1.5-1.5 2.5-1.5s2 .6 2.2 1.6c.2 1.1-.6 1.7-2.2 2.1s-2.4 1-2.2 2.2c.2 1.1 1.2 1.6 2.4 1.6s2-.5 2.5-1.4" />
        </>
      );
    case 'check':
      return <Path {...common} d="M5 12.5l4.5 4.5L19 7.5" />;
    case 'verified':
      return (
        <>
          <Path {...common} d="M12 3l2.2 1.4 2.6-.2 1.2 2.3 2.3 1.2-.2 2.6L21 12l-1.1 2.3.2 2.6-2.3 1.2-1.2 2.3-2.6-.2L12 21l-2.2-1.4-2.6.2-1.2-2.3-2.3-1.2.2-2.6L3 12l1.1-2.3-.2-2.6 2.3-1.2 1.2-2.3 2.6.2L12 3z" />
          <Path {...common} d="M9 12l2 2 4-4" />
        </>
      );
    case 'warning':
      return (
        <>
          <Path {...common} d="M12 4l9 16H3L12 4z" />
          <Line {...common} x1="12" y1="10" x2="12" y2="14" />
          <Circle cx="12" cy="17" r="1" fill={color} stroke="none" />
        </>
      );
    case 'edit':
      return <Path {...common} d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3zM13 6l3 3" />;
    case 'share':
      return (
        <>
          <Circle {...common} cx="18" cy="6" r="2.5" />
          <Circle {...common} cx="6" cy="12" r="2.5" />
          <Circle {...common} cx="18" cy="18" r="2.5" />
          <Path {...common} d="M8.3 10.8l7.4-3.6M8.3 13.2l7.4 3.6" />
        </>
      );
    case 'more':
      return (
        <>
          <Circle cx="6" cy="12" r="1.5" fill={color} stroke="none" />
          <Circle cx="12" cy="12" r="1.5" fill={color} stroke="none" />
          <Circle cx="18" cy="12" r="1.5" fill={color} stroke="none" />
        </>
      );
    default:
      return <Circle {...common} cx="12" cy="12" r="7" />;
  }
}

export function Icon({ name, size = 'md', tone = 'secondary', accessibilityLabel }: Props) {
  const theme = useTheme();
  const pixelSize = theme.sizes.icon[size];
  const color = (() => {
    switch (tone) {
      case 'primary':
        return theme.colors.text.primary;
      case 'secondary':
        return theme.colors.text.secondary;
      case 'tertiary':
        return theme.colors.text.tertiary;
      case 'gold':
        /** @deprecated — maps to active green emphasis, not lime or navy CTA */
        return theme.colors.state.active;
      case 'inverse':
        return theme.colors.text.inverse;
      case 'error':
        return theme.colors.status.error;
      default:
        return theme.colors.text.secondary;
    }
  })();

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? name}
      style={[styles.wrap, { width: pixelSize, height: pixelSize }]}
    >
      <IconGlyph name={name} color={color} pixelSize={pixelSize} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
