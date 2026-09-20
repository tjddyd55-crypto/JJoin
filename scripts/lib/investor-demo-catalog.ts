/**
 * Investor/demo catalog SSOT facade.
 * UI-visible rows use natural Korean copy only.
 * Internal tags (source, batchVersion, providerSubject, clientIdempotencyKey) stay off-screen.
 */
export {
  DEMO_SUBJECT_PREFIX,
  DEMO_EMAIL_DOMAIN,
  DEMO_JOIN_TITLE_PREFIX,
  DEMO_FACILITY_KEY_PREFIX,
  DEMO_COURSE_EXTERNAL_PREFIX,
  DEMO_VENUE_PLACE_PREFIX,
  DEMO_CLUB_NAME_PREFIX,
  DEMO_BANNER_TITLE_PREFIX,
  DEMO_DM_KEY_PREFIX,
  PROTECTED_PROVIDER_SUBJECTS,
  PROTECTED_NICKNAME_MARKERS,
  demoEmail,
  demoProviderSubject,
  demoBannerTitle,
  demoClubName,
  isProtectedProviderSubject,
  isProtectedNickname,
  isDemoEmail,
  isDemoProviderSubject,
} from './investor-demo-identity.ts';

export {
  DEMO_PERSONAS,
  DEMO_PERSONA_SLUGS,
  listHostSlugs,
  listPlayerSlugs,
  validatePersonaCatalog,
  type DemoPersonaSlug,
  type DemoPersonaSpec,
  type DemoPersonaRole,
} from './investor-demo-personas.ts';

export {
  DEMO_STORES,
  DEMO_FIELD_COURSE_FALLBACKS,
  DEMO_BANNERS,
  DEMO_CLUBS,
  DEMO_CLUB,
  demoClubInviteCodes,
  demoBannerTitles,
  demoClubNames,
  validateVenueCatalog,
  type DemoStoreSpec,
  type DemoCourseFallback,
  type DemoBannerSpec,
  type DemoClubSpec,
} from './investor-demo-venues.ts';

export {
  INVESTOR_DEMO_BATCH_VERSION,
  INVESTOR_DEMO_JOIN_KEY_PREFIX,
  SCREEN_OPEN_TARGET,
  FIELD_OPEN_TARGET,
  buildJoinPlans,
  summarizeJoinPlans,
  joinIdempotencyKey,
  type DemoJoinPlan,
} from './investor-demo-joins.ts';

export { assertSafeUiCopy } from './investor-demo-copy.ts';
