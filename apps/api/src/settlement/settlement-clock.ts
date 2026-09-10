import { isDevelopmentUnsafePathAllowed } from '../config/app-variant';

/**
 * Injectable settlement clock — tests may override via SettlementService injection.
 */
export interface SettlementClock {
  now(): Date;
}

export class SystemSettlementClock implements SettlementClock {
  now(): Date {
    return new Date();
  }
}

/** Development-variant QA only — production never, even if SOCIAL_AUTH_MODE is hybrid/mock. */
export function isSettlementQaAllowed(): boolean {
  if (!isDevelopmentUnsafePathAllowed()) return false;
  const mode = (process.env.SOCIAL_AUTH_MODE ?? 'mock').trim().toLowerCase();
  return mode === 'mock' || mode === 'hybrid';
}
