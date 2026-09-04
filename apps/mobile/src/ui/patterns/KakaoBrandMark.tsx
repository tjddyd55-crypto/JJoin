import Svg, { Path } from 'react-native-svg';

/** Kakao Talk bubble mark — vector only, no external asset download. */
export function KakaoBrandMark({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityRole="image">
      <Path
        fill="#191600"
        d="M12 3C6.477 3 2 6.58 2 11c0 2.77 1.84 5.2 4.6 6.58-.2.74-.72 2.68-.82 3.1-.13.55.2.54.42.39.18-.12 2.9-1.97 4.08-2.76.5.04 1 .07 1.52.07 5.523 0 10-3.58 10-8.08C22 6.58 17.523 3 12 3Z"
      />
    </Svg>
  );
}
