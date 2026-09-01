import { formatCoin } from '@jjoin/domain';
import type { JoinCoinPreviewDto } from '@jjoin/types';

export type JoinCreateFooterState = {
  helperText: string | null;
  showWalletCta: boolean;
  createDisabled: boolean;
  createLabel: string;
};

type Params = {
  venueReady: boolean;
  resolvingRouteVenue: boolean;
  submitting: boolean;
  identityVerified: boolean;
  previewLoading: boolean;
  canCreate: boolean;
  preview: JoinCoinPreviewDto | null;
  shortfall: string | null;
  insufficientCtaLabel: string;
  insufficientLabel: string;
};

export function resolveJoinCreateFooterState(params: Params): JoinCreateFooterState {
  const {
    venueReady,
    resolvingRouteVenue,
    submitting,
    identityVerified,
    previewLoading,
    canCreate,
    preview,
    shortfall,
    insufficientCtaLabel,
    insufficientLabel,
  } = params;

  const createDisabled =
    !venueReady || submitting || (identityVerified && (!canCreate || previewLoading));

  const createLabel = identityVerified
    ? canCreate
      ? '조인 생성'
      : insufficientCtaLabel
    : '조인 생성';

  if (submitting) {
    return { helperText: null, showWalletCta: false, createDisabled, createLabel };
  }

  if (!venueReady) {
    return {
      helperText: resolvingRouteVenue ? '장소 정보를 불러오는 중…' : '장소를 먼저 선택해주세요.',
      showWalletCta: false,
      createDisabled,
      createLabel,
    };
  }

  if (identityVerified && previewLoading) {
    return {
      helperText: '코인 정보를 확인하는 중…',
      showWalletCta: false,
      createDisabled,
      createLabel,
    };
  }

  if (identityVerified && !canCreate) {
    if (preview?.walletAvailable != null && preview.totalRequiredCoin != null) {
      return {
        helperText: `보유 ${formatCoin(preview.walletAvailable)} · 조인 생성에 ${formatCoin(preview.totalRequiredCoin)} 필요`,
        showWalletCta: true,
        createDisabled,
        createLabel,
      };
    }
    if (shortfall) {
      return {
        helperText: insufficientLabel.replace('{amount}', shortfall),
        showWalletCta: true,
        createDisabled,
        createLabel,
      };
    }
    return {
      helperText: insufficientLabel,
      showWalletCta: true,
      createDisabled,
      createLabel,
    };
  }

  return { helperText: null, showWalletCta: false, createDisabled, createLabel };
}
