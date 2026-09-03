# 쪼인존 Bright Social Sports Design System

React Native UI SSOT for the **쪼인존** mobile app.

Figma: https://www.figma.com/design/sL62yQIhgY1l0WUcksWuPo  
Direction: **Bright Social Sports** (general UI) · **Black & Gold** isolated under Premium tokens.

## Architecture

```
Token → Primitive → Component → Layout → Pattern (mobile) → Screen
```

| Layer | Package path | Responsibility |
|-------|--------------|----------------|
| Tokens | `packages/design-system/src/tokens/` | Raw palette + semantic + premium |
| Theme | `packages/design-system/src/theme/` | `brightSocialSportsTheme` + provider |
| Primitives | `packages/design-system/src/primitives/` | Text, Box, Row, Stack, Spacer, Divider |
| Components | `packages/design-system/src/components/` | Button, BrandMark, PremiumBadge, … |
| Layout | `packages/design-system/src/layout/` | ScreenFrame, Section, … |
| Patterns | `apps/mobile/src/ui/patterns/` | JoinCard, RewardCoinInput (domain UI) |

## Brand

- Official user-facing name: **쪼인존**
- Technical ids (`com.jjoin.app`, schemes, Expo slug) stay unchanged
- App display names: Production `쪼인존` · Development `쪼인존 DEV`

## Token SSOT

### Colors

- **Primitive:** `tokens/palette.ts` — Bright core + archived Premium/Black-Gold
- **Semantic:** `tokens/colors.ts` → `semanticColors` via `useTheme().colors`
- **Premium:** `premiumColors` via `useTheme().premium` (badges, paywall, Premium cards only)
- **Legacy flat `colors`:** kept for older imports

### CTA contrast

Primary CTA = Fresh Lime (`#A7E65B`) background + Deep Navy (`#17212B`) text.  
**Never** put white text on Fresh Lime.

### How To Change

| Question | Where to edit |
|----------|---------------|
| Primary CTA color? | `palette.lime500` → `semanticColors.action.primary` |
| App background? | `palette.warmWhite` → `semanticColors.app.background` |
| Premium gold? | `palette.premiumGold` → `premiumColors.gold` |
| Screen horizontal padding? | `layoutSpacing.screenHorizontal` |
| Primary CTA height? | `sizes.button.lg` |

## Public API

```tsx
import {
  BrandMark,
  Button,
  Card,
  PremiumBadge,
  Text,
  ScreenFrame,
  useTheme,
  brightSocialSportsTheme,
} from '@jjoin/design-system';
```

Deep imports (`@jjoin/design-system/src/...`) are discouraged.

## Archive

Previous Club Minimal / Black & Gold direction is preserved as:

- Premium semantic tokens (`theme.premium.*`)
- Figma archive pages (do not delete historical frames)
- Deprecated palette aliases (`gold500`, `neutral950`, …)

## Component Catalog

Dev-only route: `/dev/design-system`
