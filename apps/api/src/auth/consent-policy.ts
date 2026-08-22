/** Current legal document versions — snapshot on consent. */
export const TERMS_VERSION = '2026-08-22';

export const REQUIRED_CONSENT_TYPES = [
  'TERMS_OF_SERVICE',
  'PRIVACY_POLICY',
  'IDENTITY_NOTICE',
  'LOCATION',
] as const;

export type RequiredConsentType = (typeof REQUIRED_CONSENT_TYPES)[number];
