# Domain UI Patterns

JJOIN-specific composed UI — **not** in `@jjoin/design-system` core.

## Available

| Pattern | File |
|---------|------|
| SocialLoginButton | `SocialLoginButton.tsx` |
| JoinCard | `JoinCard.tsx` |
| VenueCard | `VenueCard.tsx` |
| VenuePreviewCard | `VenuePreviewCard.tsx` |
| RewardCoinInput | `RewardCoinInput.tsx` |
| CoinSummaryCard | `CoinSummaryCard.tsx` |
| MapSearchBar | `MapSearchBar.tsx` |
| MapFilterBar | `MapFilterBar.tsx` |
| MapVenueMarker (+ location controls) | `MapVenueMarker.tsx` |

## Rules

- Import primitives/components from `@jjoin/design-system` only.
- No API calls inside patterns.
- Business state stays in feature hooks/screens.
