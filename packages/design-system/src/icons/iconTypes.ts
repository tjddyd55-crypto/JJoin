/** Figma CM / Icon /* name registry — type-safe icon identifiers. */
export const iconNames = [
  'home',
  'map',
  'explore',
  'create',
  'wallet',
  'profile',
  'back',
  'close',
  'search',
  'filter',
  'location',
  'currentLocation',
  'venue',
  'golf',
  'people',
  'clock',
  'calendar',
  'notification',
  'chevronRight',
  'chevronDown',
  'chevronUp',
  'plus',
  'minus',
  'coin',
  'check',
  'verified',
  'warning',
  'edit',
  'share',
  'more',
] as const;

export type IconName = (typeof iconNames)[number];

export type IconSize = 'sm' | 'md' | 'lg';
export type IconTone = 'primary' | 'secondary' | 'tertiary' | 'gold' | 'inverse' | 'error';
