# JJOIN Club Minimal Design System

React Native UI SSOT for the JJOIN mobile app. Figma visual reference: `12_CLUB_MINIMAL_FINAL`, `13_CLUB_MINIMAL_HANDOFF`.

## Architecture

```
Token → Primitive → Component → Layout → Pattern (mobile) → Screen
```

| Layer | Package path | Responsibility |
|-------|--------------|----------------|
| Tokens | `packages/design-system/src/tokens/` | Raw palette + semantic mapping |
| Theme | `packages/design-system/src/theme/` | Composed theme object + provider |
| Primitives | `packages/design-system/src/primitives/` | Text, Box, Row, Stack, Spacer, Divider |
| Components | `packages/design-system/src/components/` | Button, Input, Card, … |
| Layout | `packages/design-system/src/layout/` | ScreenFrame, Section, … |
| Patterns | `apps/mobile/src/ui/patterns/` | JoinCard, RewardCoinInput (domain UI) |

## Public API

```tsx
import {
  Button,
  Card,
  Text,
  ScreenFrame,
  useTheme,
} from '@jjoin/design-system';
```

Deep imports (`@jjoin/design-system/src/...`) are discouraged.

## Token SSOT

### Colors

- **Raw palette:** `tokens/palette.ts` — never use directly in screens.
- **Semantic:** `tokens/colors.ts` → `semanticColors` — use via `useTheme().colors`.
- **Legacy flat `colors`:** kept for existing screens during migration.

### Typography

- **File:** `tokens/typography.ts`
- **Font:** IBM Plex Sans KR (load via `expo-font` in mobile bootstrap — Phase 1B)
- **Usage:** `<Text variant="sectionTitle" tone="primary">`

### Spacing

- **Scale:** `spacing.xxs` … `spacing.xxl`
- **Layout semantics:** `layoutSpacing.screenHorizontal` (20), `cardGap` (12), `sectionGap` (24)

### Radius / Sizes

- `tokens/radius.ts` — xs … sheet, full
- `tokens/sizes.ts` — button, input, icon, avatar heights

## How To Change

| Question | Where to edit |
|----------|---------------|
| JJOIN Gold color? | `tokens/palette.ts` → `gold500`, then verify `semanticColors.action.primary` |
| All screen horizontal padding? | `tokens/spacing.ts` → `layoutSpacing.screenHorizontal` (used by ScreenFrame) |
| Primary CTA height? | `tokens/sizes.ts` → `sizes.button.lg` (52px) |
| Card corner radius? | `tokens/radius.ts` → `radius.lg` + `Card` variant mapping |
| Section vertical rhythm? | `layoutSpacing.sectionGap` + `layout/Section.tsx` |
| Bottom nav height? | `sizes.bottomNav` + `BottomNavigation` component |

## Components

| Component | Variants / notes |
|-----------|------------------|
| Button | primary, secondary, ghost, danger × sm/md/lg |
| IconButton | ghost, surface, selected |
| Input | label, helper, error, leftIcon, rightElement |
| Card | base, elevated, floating, interactive |
| Chip | filter, selected, quickAdd |
| Badge | neutral, gold, success, warning, error |
| AppBar | title, subtitle, back, actions |
| BottomNavigation | 5-tab config via `items` prop |
| BottomSheetFrame | visual frame only (not sheet runtime) |
| ListRow | settings/menu rows — full-width press, chevron, danger tone |

## Frames

| Frame | Use when |
|-------|----------|
| `ScreenFrame` | Static screen, safe area + horizontal padding |
| `ScrollScreenFrame` | Scrollable content |
| `FormScreenFrame` | Forms + keyboard avoiding |
| `StickyActionFrame` | Bottom CTA bar |
| `Section` | Titled content blocks |

## Patterns (not in design-system core)

Domain components belong in `apps/mobile/src/ui/patterns/`:

- `JoinCard`
- `VenueCard`
- `RewardCoinInput`
- `WalletTransactionRow`

They compose design-system primitives only — no Coin/Join business logic inside DS core.

## Figma Mapping

| Figma token | Code |
|-------------|------|
| app/background `#09090A` | `theme.colors.app.background` |
| surface/card `#171719` | `theme.colors.surface.card` |
| gold/primary `#D4AF37` | `theme.colors.action.primary` |
| text/primary `#F5F2EA` | `theme.colors.text.primary` |
| screen padding 20 | `layoutSpacing.screenHorizontal` |
| Primary CTA ~52px | `sizes.button.lg` |

## Component Catalog

Dev-only route: `/dev/design-system` (not in production navigation).

## Legacy / Deprecation

| Legacy | Replacement |
|--------|-------------|
| `ScreenContainer` | `ScreenFrame` |
| `FormField` | `Input` |
| `BottomActionBar` | `StickyActionFrame` |
| `AppText` + flat `colors` | `Text` + `useTheme()` |
| `StatusBadge` | `Badge` (generic) |

## No Hardcode Rule

In new code, do not use raw `#09090A`, `fontSize: 17`, or `paddingHorizontal: 20` when a token exists.

## Real Product Examples (Phase 1B / 1C)

| Screen | Frames / Components | Patterns |
|--------|---------------------|----------|
| **Login** | `ScreenFrame`, `StickyActionFrame`, `Text` | `SocialLoginButton` (OAuth handlers unchanged) |
| **Terms** | `FormScreenFrame`, `StickyActionFrame`, `Card`, `Text`, `Icon` | `OnboardingHeader` + consent rows; detail → shared `/auth/legal` |
| **Profile Setup** | `FormScreenFrame`, `Input`, `Chip`, `StickyActionFrame` | public profile fields only; server `nickname_taken` surfaced |
| **Profile Photo** | `FormScreenFrame`, `UserAvatar`, `Card`, `StickyActionFrame` | existing upload/skip API; `OnboardingHeader` step 3 |
| **Location** | `FormScreenFrame`, `Card`, `Icon`, `StickyActionFrame` | permission + settings retry; no Map SDK |
| **Identity Gate** | `ScreenFrame`, `Card`, `StickyActionFrame` | deferred; return intent via `completeGateAndReturn` |
| **Legal docs** | `ScrollScreenFrame` | SSOT `LEGAL_DOCUMENTS` — MY + Terms share bodies |
| **Account** | `ScreenFrame`, `Card`, `Badge`, `StickyActionFrame` | real `me.socialLinks`; logout ≠ unlink |
| **Home** | `ScrollScreenFrame`, `Section`, `IconButton` | empty states via DS Card surface tokens |
| **Map** | overlay only — Kakao native map preserved | `MapSearchBar`, `MapFilterBar`, `CurrentLocationControl`, `ReSearchAreaControl` |
| **Venue** | `BottomSheetFrame` inside `@gorhom/bottom-sheet` | `VenuePreviewCard`, `VenueCard`, `JoinCard` |
| **Join Detail** | `ScrollScreenFrame` + `StickyActionFrame`, `Badge`, `Card` | status → Badge variant mapping |
| **Join Create** | `FormScreenFrame` + `StickyActionFrame`, `Chip` | `RewardCoinInput`, `CoinSummaryCard` (preview props only) |
| **MY / Profile** | `ScrollScreenFrame`, `Card`, `ListRow`, `Badge` | wallet summary Card, settings grouped list, **Membership** |

### Membership (Phase E)

Patterns live in `apps/mobile/src/ui/patterns/` — not DS core:

- `MembershipBadge` — FREE `neutral` / PREMIUM `gold` (restrained)
- `MembershipSummaryCard` — effective plan + period + cancel notice
- `MembershipBenefitRow` — benefit lines
- Access: `useMembership()` (Session `MeDto.membership` SSOT)

```tsx
import { MembershipBadge } from '../ui/patterns/MembershipBadge';
import { useMembership } from '../features/membership/useMembership';

const { state, presentation } = useMembership();
{state === 'ready' && presentation ? (
  <MembershipBadge presentation={presentation} />
) : null}
```

Do **not** put Premium badge on public profile or JoinCard.
Do **not** invent client `isPremium` or compute room fee locally — Join Create uses server coin-preview.

### Auth / Onboarding (Phase 1C)

Flow SSOT: `resolveAuthAppState` + `resolveOnboardingStep` in `@jjoin/domain`.

- New user: Social Login → Terms → Profile Setup → Photo → Location → Home
- Existing user: Social Login → Home
- Identity: deferred (`AUTHENTICATED_IDENTITY_UNVERIFIED` may browse; gate on create/apply)
- Legal text SSOT: `apps/mobile/src/features/auth/legal.ts` (`LEGAL_DOCUMENTS` + i18n body keys)
- Progress UI: `OnboardingHeader` (mobile pattern) — Terms/Profile/Photo/Location

### Profile / Settings list

```tsx
<Card variant="base" padding="none">
  <ListRow label="계정 관리" icon="profile" onPress={handleAccount} />
  <ListRow label="회원탈퇴" tone="danger" onPress={handleWithdraw} showSeparator={false} />
</Card>
```

- 전체 row가 터치 영역 (`minHeight` 52px, pressed opacity)
- destructive action은 `tone="danger"`
- `SettingRow`는 mobile pattern layer에서 `ListRow` alias

### Map — DS vs native responsibility

| Responsibility | Owner |
|----------------|-------|
| Kakao Map SDK / markers / camera / presence | `KakaoMapAdapter` + ExploreMapScreen logic |
| Search bar, filters, FABs, sheet chrome | `apps/mobile/src/ui/patterns` + DS |

### Create — reward flow

1. Screen holds `rewardPerParticipant` state + `useJoinCoinPreview`
2. `RewardCoinInput` edits the string (Quick Add additive, number-pad)
3. `CoinSummaryCard` displays server preview numbers only

## Next Phase

Phase 1C Auth/Onboarding product completion → then **JJOIN ADMIN FOUNDATION**.
