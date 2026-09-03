/** @jjoin/design-system — Bright Social Sports SSOT for React Native UI */

// Tokens
export * from './tokens';

// Theme
export {
  brightSocialSportsTheme,
  clubMinimalTheme,
  ThemeProvider,
  useTheme,
  type BrightSocialSportsTheme,
  type ClubMinimalTheme,
} from './theme';

// Primitives
export { AppText } from './primitives/AppText';
export { Text } from './primitives/Text';
export { Stack } from './primitives/Stack';
export { Box } from './primitives/Box';
export { Row } from './primitives/Row';
export { Spacer } from './primitives/Spacer';
export { Divider } from './primitives/Divider';

// Icons
export { Icon, iconNames, type IconName, type IconSize, type IconTone } from './icons';

// Components
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './components/Button';
export {
  IconButton,
  type IconButtonProps,
  type IconButtonVariant,
  type IconButtonSize,
} from './components/IconButton';
export { Input, type InputProps } from './components/Input';
export { Card, type CardProps, type CardVariant, type CardPadding } from './components/Card';
export { Chip, type ChipProps, type ChipVariant } from './components/Chip';
export { Badge, type BadgeProps, type BadgeVariant } from './components/Badge';
export { BrandMark, type BrandMarkVariant, type BrandMarkTone } from './components/BrandMark';
export { JoinHostAvatar, type JoinHostAvatarProps, type JoinHostAvatarSize } from './components/JoinHostAvatar';
export { JoinCard, type JoinCardProps } from './components/JoinCard';
export { RecommendationReasonTag, type RecommendationReasonTagProps } from './components/RecommendationReasonTag';
export { SectionHeader, type SectionHeaderProps } from './components/SectionHeader';
export { EmptyState, type EmptyStateProps } from './components/EmptyState';
export { PremiumBadge } from './components/PremiumBadge';
export { AppBar, type AppBarProps } from './components/AppBar';
export {
  BottomNavigation,
  type BottomNavigationProps,
  type BottomNavItem,
} from './components/BottomNavigation';
export { BottomSheetFrame, type BottomSheetFrameProps } from './components/BottomSheet';
export { ListRow, type ListRowProps, type ListRowTrailing } from './components/ListRow';

// Layout
export {
  ScreenFrame,
  ScrollScreenFrame,
  FormScreenFrame,
  resolveKeyboardBottomInset,
  useFormScroll,
  StickyActionFrame,
  Section,
  type ScreenFrameProps,
  type ScrollScreenFrameProps,
  type FormScreenFrameProps,
  type StickyActionFrameProps,
  type SectionProps,
} from './layout';

// Legacy components — migration candidates (Phase 1B+)
export { UserAvatar } from './components/UserAvatar';
export { StatusBadge } from './components/StatusBadge';
export { CoinBadge } from './components/CoinBadge';
export { Modal } from './components/Modal';
/** @deprecated use ScreenFrame */
export { ScreenContainer } from './components/ScreenContainer';
/** @deprecated use Input */
export { FormField } from './components/FormField';
export { ProfileChip } from './components/ProfileChip';
/** @deprecated use StickyActionFrame */
export { BottomActionBar } from './components/BottomActionBar';
