import type { PendingActionIntent } from '@jjoin/types';

let pending: PendingActionIntent | null = null;

export function setPendingAction(intent: PendingActionIntent | null) {
  pending = intent;
}

export function getPendingAction(): PendingActionIntent | null {
  return pending;
}

export function consumePendingAction(): PendingActionIntent | null {
  const current = pending;
  pending = null;
  return current;
}
