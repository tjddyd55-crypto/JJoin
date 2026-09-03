import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = {
  width: number;
  height: number;
  skyTop: string;
  skyBottom: string;
  hillFar: string;
  hillNear: string;
  fairway: string;
  ball: string;
};

/**
 * Local vector golf landscape — no external image URL, no placeholder box.
 */
export function GolfHeroIllustration({
  width,
  height,
  skyTop,
  skyBottom,
  hillFar,
  hillNear,
  fairway,
  ball,
}: Props) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 360 170"
      preserveAspectRatio="xMidYMid slice"
      accessibilityElementsHidden
    >
      <Defs>
        <LinearGradient id="heroSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={skyTop} stopOpacity="0.55" />
          <Stop offset="1" stopColor={skyBottom} stopOpacity="0.35" />
        </LinearGradient>
      </Defs>
      <Path d="M0 0h360v170H0z" fill="url(#heroSky)" />
      <Path d="M0 118c48-18 96-10 140 4s108 22 200 8v48H0z" fill={hillFar} opacity={0.55} />
      <Path d="M0 132c72-14 132-6 188 10s116 18 148 6v32H0z" fill={hillNear} opacity={0.72} />
      <Path d="M0 148c90-8 150 0 220 14s90 10 140 0v22H0z" fill={fairway} opacity={0.9} />
      <Path
        d="M248 54c-18 0-32 14-32 32s14 32 32 32 32-14 32-32-14-32-32-32z"
        fill={ball}
        opacity={0.18}
      />
      <Circle cx="286" cy="62" r="7" fill={ball} opacity={0.92} />
      <Path
        d="M286 62 L286 38"
        stroke={ball}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.75}
      />
    </Svg>
  );
}
