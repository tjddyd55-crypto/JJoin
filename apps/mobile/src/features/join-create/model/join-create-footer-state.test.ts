import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveJoinCreateFooterState } from './join-create-footer-state';

const base = {
  venueReady: true,
  resolvingRouteVenue: false,
  submitting: false,
  identityVerified: true,
  previewLoading: false,
  canCreate: true,
  preview: {
    roomCreationFee: '100',
    rewardPerParticipant: '0',
    rewardEligibleSlots: 2,
    rewardHoldTotal: '0',
    totalRequiredCoin: '100',
    walletAvailable: '500',
    walletAfterCreation: '400',
    canCreate: true,
  },
  shortfall: null,
  insufficientCtaLabel: 'Coin이 부족합니다',
  insufficientLabel: 'Coin이 {amount} 부족합니다.',
};

test('shows venue helper when place is not selected', () => {
  const state = resolveJoinCreateFooterState({ ...base, venueReady: false });
  assert.equal(state.helperText, '장소를 먼저 선택해주세요.');
  assert.equal(state.createDisabled, true);
  assert.equal(state.showWalletCta, false);
});

test('shows coin shortfall with wallet CTA', () => {
  const state = resolveJoinCreateFooterState({
    ...base,
    canCreate: false,
    preview: {
      ...base.preview,
      walletAvailable: '0',
      totalRequiredCoin: '100',
      canCreate: false,
    },
  });
  assert.equal(state.helperText, '보유 0C · 조인 생성에 100C 필요');
  assert.equal(state.showWalletCta, true);
  assert.equal(state.createDisabled, true);
  assert.equal(state.createLabel, 'Coin이 부족합니다');
});

test('allows create when venue and coin are ready', () => {
  const state = resolveJoinCreateFooterState(base);
  assert.equal(state.helperText, null);
  assert.equal(state.createDisabled, false);
  assert.equal(state.createLabel, '조인 생성');
});
