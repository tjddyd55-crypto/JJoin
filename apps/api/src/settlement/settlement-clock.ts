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

/** DEV/mock QA only — never exposed to production real users without guard. */
export function isSettlementQaAllowed(): boolean {
  return process.env.SOCIAL_AUTH_MODE === 'mock';
}
