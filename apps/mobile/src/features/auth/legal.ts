import type { MessageKey } from '@jjoin/i18n';

/** Shared legal document ids — MY + onboarding Terms use the same SSOT. */
export type LegalDocId = 'tos' | 'privacy' | 'identity' | 'location' | 'marketing';

export type AuthConsentItem = {
  id: 'termsOfService' | 'privacy' | 'identity' | 'location' | 'marketing';
  labelKey: MessageKey;
  required: boolean;
  /** Opens shared legal document when set. */
  docId?: LegalDocId;
};

export const AUTH_CONSENT_ITEMS: AuthConsentItem[] = [
  { id: 'termsOfService', labelKey: 'auth.terms.tos', required: true, docId: 'tos' },
  { id: 'privacy', labelKey: 'auth.terms.privacy', required: true, docId: 'privacy' },
  { id: 'identity', labelKey: 'auth.terms.identity', required: true, docId: 'identity' },
  { id: 'location', labelKey: 'auth.terms.location', required: true, docId: 'location' },
  { id: 'marketing', labelKey: 'auth.terms.marketing', required: false, docId: 'marketing' },
];

export const LEGAL_DOCUMENTS: Record<
  LegalDocId,
  { titleKey: MessageKey; bodyKey: MessageKey }
> = {
  tos: { titleKey: 'my.terms', bodyKey: 'legal.tos.body' },
  privacy: { titleKey: 'my.privacy', bodyKey: 'legal.privacy.body' },
  identity: { titleKey: 'legal.identity.title', bodyKey: 'legal.identity.body' },
  location: { titleKey: 'legal.location.title', bodyKey: 'legal.location.body' },
  marketing: { titleKey: 'legal.marketing.title', bodyKey: 'legal.marketing.body' },
};

export function legalDocumentRoute(docId: LegalDocId): `/auth/legal?doc=${LegalDocId}` {
  return `/auth/legal?doc=${docId}`;
}

/** MY menu entry — defaults to ToS; privacy uses its own doc query. */
export const AUTH_LEGAL_ROUTE = legalDocumentRoute('tos');
