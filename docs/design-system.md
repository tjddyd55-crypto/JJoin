# Design System

## Goal

전문 App Designer가 Figma/Visual Language를 전면 교체해도  
Domain/API/Business Logic을 건드리지 않고 Presentation Layer만 교체 가능.

## Tokens (`packages/design-system/src/tokens`)

- colors.ts
- spacing.ts
- radius.ts
- typography.ts
- shadows.ts
- sizing.ts

Naming aligns toward Figma variables: `color/primary` ↔ `colors.primary`, `space/md` ↔ `spacing.md`.

## Foundation Components (Phase 2)

Primitives: AppText, Box, Stack, Divider  
Components: Button, UserAvatar, StatusBadge, CoinBadge, Modal, ScreenContainer, FormField, ProfileChip, BottomActionBar

더 많은 카드/폼은 Figma 반복 요소 확인 후 추가. 과잉 선행 금지.

## Styling Rule

```ts
// ✅
import { colors, spacing } from '@jjoin/design-system';
StyleSheet.create({ root: { backgroundColor: colors.background, padding: spacing.md } });

// ❌
style={{ backgroundColor: '#123456', padding: 17 }}
```

## Figma ↔ Code Names

UserAvatar, CoinBadge, JoinCard, Button, StatusBadge — 가능하면 동일 naming.
