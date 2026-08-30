export enum SocialProvider {
  KAKAO = 'KAKAO',
  NAVER = 'NAVER',
  GOOGLE = 'GOOGLE',
}

export enum IdentityStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

/** App-level session readiness — not a single isLoggedIn boolean. */
export enum AuthAppState {
  BOOTSTRAPPING = 'BOOTSTRAPPING',
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  AUTHENTICATED_NEEDS_TERMS = 'AUTHENTICATED_NEEDS_TERMS',
  AUTHENTICATED_PROFILE_INCOMPLETE = 'AUTHENTICATED_PROFILE_INCOMPLETE',
  /** Browse allowed; create/join/coin actions hit Identity Gate. */
  AUTHENTICATED_IDENTITY_UNVERIFIED = 'AUTHENTICATED_IDENTITY_UNVERIFIED',
  READY = 'READY',
}

export enum MockAuthScenario {
  NEW_USER = 'NEW_USER',
  RETURNING_USER = 'RETURNING_USER',
}

/** Stable DEV personas for one-device A↔B E2E (mock auth only). Not account roles. */
export enum MockAuthPersona {
  DEV_A = 'DEV_A',
  DEV_B = 'DEV_B',
  DEV_ADMIN = 'DEV_ADMIN',
}

export enum JoinMethod {
  OPEN = 'OPEN',
  APPROVAL = 'APPROVAL',
}

export enum JoinKind {
  STANDARD = 'STANDARD',
  STORE_MATCHING = 'STORE_MATCHING',
}

export enum MatchingRewardTarget {
  FEMALE = 'FEMALE',
  MALE = 'MALE',
  ALL = 'ALL',
}

export enum StoreVerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  REVOKED = 'REVOKED',
}

export enum StoreOwnerRelation {
  REPRESENTATIVE = 'REPRESENTATIVE',
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  OTHER = 'OTHER',
}

export enum StoreOwnershipStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
}

export enum ParticipantRole {
  HOST = 'HOST',
  PARTICIPANT = 'PARTICIPANT',
}

export enum SportSkillLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  PRO = 'PRO',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  UNSPECIFIED = 'UNSPECIFIED',
  OTHER = 'OTHER',
}

export enum AgeBand {
  TEENS = 'TEENS',
  TWENTIES = 'TWENTIES',
  THIRTIES = 'THIRTIES',
  FORTIES = 'FORTIES',
  FIFTIES_PLUS = 'FIFTIES_PLUS',
  UNSPECIFIED = 'UNSPECIFIED',
}

export enum SocialLinkStatus {
  CONNECTED = 'CONNECTED',
  NOT_CONNECTED = 'NOT_CONNECTED',
}

export enum JoinStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  FULL = 'FULL',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  SETTLING = 'SETTLING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ParticipationStatus {
  APPLIED = 'APPLIED',
  APPROVED = 'APPROVED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
  LEFT_EARLY = 'LEFT_EARLY',
  CANCELLED = 'CANCELLED',
  DISPUTED = 'DISPUTED',
}

export enum RewardStatus {
  NOT_ELIGIBLE = 'NOT_ELIGIBLE',
  HELD = 'HELD',
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
  PAID = 'PAID',
  AUTO_PAID = 'AUTO_PAID',
  DISPUTED = 'DISPUTED',
  REFUNDED = 'REFUNDED',
}

export enum CoinTxType {
  ROOM_CREATION_FEE = 'ROOM_CREATION_FEE',
  JOIN_REWARD_HOLD = 'JOIN_REWARD_HOLD',
  JOIN_REWARD_RELEASE = 'JOIN_REWARD_RELEASE',
  JOIN_REWARD_TRANSFER = 'JOIN_REWARD_TRANSFER',
  JOIN_REWARD_REFUND = 'JOIN_REWARD_REFUND',
  /** @deprecated Prefer COIN_ISSUANCE + CoinIssuance row. Still counts as ISSUANCE for supply. */
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
  /** New Coin mint — must pair with CoinIssuance (balance SSOT remains CoinTransaction). */
  COIN_ISSUANCE = 'COIN_ISSUANCE',
}

/** Why new Coin entered supply. Transfer/hold/refund must NEVER use these. */
export enum CoinIssuanceType {
  PURCHASE = 'PURCHASE',
  EVENT_REWARD = 'EVENT_REWARD',
  SIGNUP_BONUS = 'SIGNUP_BONUS',
  PROMOTION = 'PROMOTION',
  ADMIN_GRANT = 'ADMIN_GRANT',
  CUSTOMER_SUPPORT = 'CUSTOMER_SUPPORT',
  DEV_SEED = 'DEV_SEED',
  OTHER = 'OTHER',
}

export enum CoinIssuanceStatus {
  COMPLETED = 'COMPLETED',
}

/** Actions that require identity verification (POLICY_TBD for final list). */
export type GatedActionType = 'CREATE_JOIN' | 'APPLY_JOIN' | 'COIN_ACTIVITY';

export type PendingActionIntent =
  | { type: 'CREATE_JOIN' }
  | { type: 'APPLY_JOIN'; joinId: string }
  | { type: 'COIN_ACTIVITY'; reason: string };

export type SportProfileDto = {
  sportCode: string;
  skillLevel: SportSkillLevel;
};

export type PublicUserProfileDto = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  verifiedBadge: boolean;
  genderDisplay: string | null;
  ageBand: AgeBand | null;
  regionLabel: string | null;
  bio: string | null;
  sportProfiles: SportProfileDto[];
  participationCount: number;
  /** Objective attendance stats (COMPLETED / NO_SHOW). */
  completedJoinCount?: number;
  noShowCount?: number;
  /** 0–100; null when no attendance outcomes yet. */
  attendanceRatePercent?: number | null;
};

/** Never include real name, phone, CI/DI, raw birth date here. */
export type PrivateIdentityDto = {
  verificationStatus: IdentityStatus;
  verifiedAt: string | null;
  provider: string | null;
};

export type SocialAccountLinkDto = {
  provider: SocialProvider;
  status: SocialLinkStatus;
};

export type WalletTransactionDto = {
  id: string;
  type: CoinTxType;
  direction: 'DEBIT' | 'CREDIT';
  amount: string;
  createdAt: string;
  /** Human-readable label for UI (not an accounting field). */
  label: string;
  reference: {
    refType: string | null;
    refId: string | null;
  };
};

export type WalletSummaryDto = {
  assetCode: string;
  availableCoin: string;
  heldCoin: string;
  /** available + held (display only; not a separate ledger balance). */
  totalCoin: string;
  recentTransactions: WalletTransactionDto[];
};

export type WalletTransactionsResponse = {
  items: WalletTransactionDto[];
  nextCursor: string | null;
};

export type JoinCoinPreviewDto = {
  roomCreationFee: string;
  rewardPerParticipant: string;
  rewardEligibleSlots: number;
  rewardHoldTotal: string;
  totalRequiredCoin: string;
  walletAvailable: string;
  /** available − totalRequired when affordable; else walletAvailable unchanged. */
  walletAfterCreation: string;
  canCreate: boolean;
};

export type MeDto = {
  userId: string;
  authAppHints: {
    termsAccepted: boolean;
    profileComplete: boolean;
    hasAvatar: boolean;
    locationOnboardingComplete: boolean;
  };
  publicProfile: PublicUserProfileDto | null;
  identity: PrivateIdentityDto;
  socialLinks: SocialAccountLinkDto[];
  walletSummary: WalletSummaryDto;
};

export type AuthSessionDto = {
  accessToken: string;
  userId: string;
  scenario: MockAuthScenario;
};

export type SocialSignInRequest = {
  provider: SocialProvider;
  /** Dev/QA only — never exposed in production UI. */
  scenario?: MockAuthScenario;
  /** Dev/QA only — stable DB user (takes precedence over scenario when set). */
  persona?: MockAuthPersona;
};

export type SocialExchangeRequest = {
  provider: SocialProvider;
  /** Provider access token, ID token, or mock:test-subject (mock mode only). */
  credential: string;
};

export type SocialSignInResponse = {
  session: AuthSessionDto;
  me: MeDto;
  nextStep:
    | 'HOME'
    | 'TERMS'
    | 'IDENTITY'
    | 'PROFILE_SETUP'
    | 'PROFILE_PHOTO'
    | 'LOCATION';
};

export const DEFAULT_LOCALE = 'ko-KR';
export const DEFAULT_COUNTRY = 'KR';
export const DEFAULT_TIMEZONE = 'Asia/Seoul';
export const DEFAULT_CURRENCY = 'KRW';
export const SCREEN_GOLF_CODE = 'SCREEN_GOLF';

/** Venue.provider for GolfFacility lazy activation (not Kakao). */
export const LOCALDATA_GOLF_VENUE_PROVIDER = 'LOCALDATA_GOLF_PRACTICE_RANGE';

/** Presence visibility — OS location permission is a separate concept. */
export enum PresenceVisibility {
  HIDDEN = 'HIDDEN',
  AVAILABLE = 'AVAILABLE',
}

export type PresenceDurationOption = '1h' | '2h' | 'today';

export type ExploreFilter = 'ALL' | 'VENUE' | 'USER' | 'TODAY_JOIN';

export type ExploreJoinPreviewDto = {
  joinId: string;
  status: JoinStatus;
  startAt: string;
  scheduledEndAt: string;
  currentParticipants: number;
  maxParticipants: number;
  rewardCoin: string;
  hostNickname: string;
  hostVerified: boolean;
};

/** Venue source for Explore — Kakao live search never implies DB persistence. */
export type ExploreVenueSource = 'KAKAO_LOCAL' | 'MOCK' | 'JJOIN' | 'GOLF_FACILITY';

export type ExploreVenueDto = {
  venueId: string;
  name: string;
  address: string | null;
  roadAddress?: string | null;
  regionLabel: string | null;
  categoryName?: string | null;
  phone?: string | null;
  placeUrl?: string | null;
  latitude: number;
  longitude: number;
  distanceMeters: number | null;
  openJoinCount: number;
  /** Today (local) valid joins still not ended. */
  todayJoinCount?: number;
  /** Today JOINABLE-only count (excludes FULL / no seats). */
  todayJoinableCount?: number;
  /** Currently in progress joins. */
  ongoingJoinCount?: number;
  hasTodayJoin?: boolean;
  hasOngoingJoin?: boolean;
  joinPreviews: ExploreJoinPreviewDto[];
  source?: ExploreVenueSource;
  /** True when Create Join from this card is supported in current product phase. */
  canCreateJoin?: boolean;
  /** Present when this Kakao/MOCK place is linked to a JJOIN Venue row. */
  jjoinVenueId?: string | null;
  /** True when a JJOIN Venue row already exists for this provider place. */
  isActivated?: boolean;
  /** True when create requires POST /venues/activate first (still canCreateJoin). */
  activationRequired?: boolean;
  provider?: string;
  providerPlaceId?: string;
  /** GolfFacility master id when source is GOLF_FACILITY (activate via golf-facilities API). */
  golfFacilityId?: string | null;
};

/**
 * Public nearby user — must NEVER include actualLat / actualLng.
 * displayLat/Lng are privacy-safe coarse points computed on server.
 */
export type PublicNearbyUserDto = {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  verifiedBadge: boolean;
  ageBand: AgeBand | null;
  genderDisplay: string | null;
  skillLevel: SportSkillLevel | null;
  approxDistanceMeters: number;
  displayLat: number;
  displayLng: number;
  regionLabel: string | null;
  availableUntil: string;
};

export type ExploreMapResponse = {
  venues: ExploreVenueDto[];
  users: PublicNearbyUserDto[];
  metadata: {
    sportCode: string;
    filter: ExploreFilter;
    source: 'mock' | 'live';
    venueCount: number;
    userCount: number;
  };
};

/** Private presence for the authenticated owner only. */
export type PrivatePresenceDto = {
  visibility: PresenceVisibility;
  availableUntil: string | null;
  accuracyMeters: number | null;
  lastLocationAt: string | null;
  /** Owner may see that a location is stored; exact coords optional for debug — omit from public APIs. */
  hasLocation: boolean;
};

export type UpsertPresenceRequest = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  duration: PresenceDurationOption;
};

/** Venue reference from mock (or future) venue provider — upserted into Postgres. */
export type JoinVenueRefInput = {
  provider: string;
  providerPlaceId: string;
  name: string;
  address?: string | null;
  regionLabel?: string | null;
  latitude: number;
  longitude: number;
};

export type ActivateVenueRequest = {
  provider: 'KAKAO' | 'MOCK';
  providerPlaceId: string;
  resolveHint?: {
    latitude: number;
    longitude: number;
    query?: string;
    sportCode?: string;
  };
};

export type ActivateVenueResponse = {
  venueId: string;
  provider: string;
  providerPlaceId: string;
  name: string;
  address: string | null;
  roadAddress: string | null;
  latitude: number;
  longitude: number;
  placeUrl: string | null;
  status: 'ACTIVE' | 'UNAVAILABLE';
  created: boolean;
};

/** Map/list projection for GolfFacility — never dump full source payload. */
export type GolfFacilityMapDto = {
  id: string;
  displayName: string;
  facilityType: string;
  screenStatus: string;
  hasScreenGolf: string;
  primaryBrand: string;
  latitude: number | null;
  longitude: number | null;
  roadAddress: string | null;
  sido: string | null;
  sigungu: string | null;
  phone?: string | null;
  coordinateStatus?: string;
  /** False when coords MISSING — browse/search only, cannot activate for Join. */
  selectable?: boolean;
  isScreenJoinEligible: boolean;
  /** Aggregated join activity for map (bounds); defaults to 0 when absent. */
  todayJoinCount?: number;
  /**
   * Today JOINABLE-only count (excludes FULL / no seats).
   * Marker badges should prefer this over todayJoinCount.
   */
  todayJoinableCount?: number;
  ongoingJoinCount?: number;
  openJoinCount?: number;
  hasTodayJoin?: boolean;
  hasOngoingJoin?: boolean;
  /** Selected date (query `date`) activity — same as today when date omitted/today. */
  selectedDateJoinCount?: number;
  hasSelectedDateJoin?: boolean;
  /** Present only when openJoinCount > 0 (keeps dense bounds payloads small). */
  joinPreviews?: ExploreJoinPreviewDto[];
};

/** Bounds query response — active + VALID coords; classification does not filter. */
export type GolfFacilityBoundsResponse = {
  items: GolfFacilityMapDto[];
  truncated: boolean;
  limit: number;
};

/** Text response — eligible (CONFIRMED) facilities; may include MISSING coords. */
export type GolfFacilitySearchResponse = {
  items: GolfFacilityMapDto[];
  nextCursor: string | null;
  limit: number;
};

export type ActivateGolfFacilityVenueResponse = {
  golfFacilityId: string;
  venueId: string;
  provider: string;
  providerPlaceId: string;
  name: string;
  activated: boolean;
  reused: boolean;
  created: boolean;
};

/** Join Create picker — saved/recent official venue row. */
export type UserVenuePickerItemDto = {
  venueId: string;
  name: string;
  address: string | null;
  roadAddress: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  golfFacilityId?: string | null;
  facilityType?: string | null;
  isFavorite?: boolean;
};

export type UserVenueListResponse = {
  items: UserVenuePickerItemDto[];
};

export type AddUserVenueFavoriteRequest = {
  venueId: string;
};

export type CreateCustomVenueRequest = {
  name: string;
  address: string;
  phone?: string | null;
};

/** Default max markers returned per viewport (server-side guard). */
export const GOLF_FACILITY_MAP_DEFAULT_LIMIT = 400;
export const GOLF_FACILITY_MAP_MAX_LIMIT = 500;
export const GOLF_FACILITY_SEARCH_DEFAULT_LIMIT = 30;

export type CreateJoinRequest = {
  sportCode: string;
  /** Prefer activated JJOIN venue id when present (Kakao path). */
  venueId?: string;
  venue?: JoinVenueRefInput;
  startAt: string;
  plannedPlayerCount: number;
  joinMethod: JoinMethod;
  title?: string | null;
  description?: string | null;
  /**
   * Host-chosen per-participant reward (Hold target).
   * Room creation fee is server policy — never trust a client fee field.
   * Omitted → DEV/TEST policy default when COIN_POLICY_MODE=dev (POLICY_TBD for production).
   */
  rewardPerParticipant?: string;
  /** Client request idempotency — same key must not double-create join/fee/hold. */
  idempotencyKey?: string;
};

export type JoinCoinPreviewRequest = {
  plannedPlayerCount: number;
  rewardPerParticipant?: string;
};

export type JoinParticipantDto = {
  participantId: string;
  userId: string;
  role: ParticipantRole;
  participationStatus: ParticipationStatus;
  nickname: string;
  verifiedBadge: boolean;
  appliedAt: string;
  approvedAt: string | null;
  /** Present for STORE_MATCHING attendance/settlement preview. */
  gender?: 'MALE' | 'FEMALE' | 'UNSPECIFIED' | 'OTHER' | null;
};

export type SettlementParticipantDto = {
  settlementId: string;
  participantId: string;
  userId: string;
  nickname: string;
  role: ParticipantRole;
  participationStatus: ParticipationStatus;
  rewardAmount: string;
  rewardStatus: RewardStatus;
  settlementAvailableAt: string;
  autoPayAt: string;
  /** Milliseconds until auto pay; 0 when due or terminal. Server-calculated. */
  autoPayCountdownMs: number;
  canHostPay: boolean;
  paidAt: string | null;
  refundedAt: string | null;
  disputedAt: string | null;
  dispute?: DisputeParticipantDto | null;
};

export type JoinSettlementSummaryDto = {
  joinId: string;
  joinStatus: JoinStatus;
  scheduledEndAt: string;
  settlementOpen: boolean;
  settlements: SettlementParticipantDto[];
};

export type SettlementIssueType = 'NO_SHOW' | 'LEFT_EARLY' | 'DISPUTE';

export type SettlementIssueRequest = {
  issueType: SettlementIssueType;
  statement?: string;
};

export enum DisputeStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
}

export enum DisputeResolution {
  PAY_PARTICIPANT = 'PAY_PARTICIPANT',
  REFUND_HOST = 'REFUND_HOST',
}

export type DisputeParticipantDto = {
  disputeId: string;
  joinId: string;
  status: DisputeStatus;
  reasonType: string;
  resolution: DisputeResolution | null;
  rewardAmount: string;
  rewardStatus: RewardStatus;
  hostStatement: string | null;
  participantStatement: string | null;
  openedAt: string;
  resolvedAt: string | null;
  canSubmitStatement: boolean;
  userFacingMessage: string;
};

export type DisputeStatementRequest = {
  statement: string;
};

export type AdminDisputeListItemDto = {
  disputeId: string;
  joinId: string;
  venueName: string;
  scheduledEndAt: string;
  hostNickname: string;
  participantNickname: string;
  rewardAmount: string;
  reasonType: string;
  status: DisputeStatus;
  openedAt: string;
};

export type AdminDisputeListResponse = {
  items: AdminDisputeListItemDto[];
  nextCursor: string | null;
};

export type AdminDisputeDetailDto = {
  disputeId: string;
  joinId: string;
  joinStatus: JoinStatus;
  venueName: string;
  scheduledEndAt: string;
  hostNickname: string;
  participantNickname: string;
  rewardAmount: string;
  rewardStatus: RewardStatus;
  holdStatus: string | null;
  reasonType: string;
  status: DisputeStatus;
  resolution: DisputeResolution | null;
  hostStatement: string | null;
  participantStatement: string | null;
  adminNote: string | null;
  openedAt: string;
  underReviewAt: string | null;
  participantStatementAt: string | null;
  resolvedAt: string | null;
};

export type AdminResolveDisputeRequest = {
  resolution: DisputeResolution;
  adminNote?: string;
};

/** Derived STORE_MATCHING UI status (not a DB enum). */
export type StoreMatchingDisplayStatus =
  | 'RECRUITING'
  | 'MINIMUM_SECURED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'ATTENDANCE_PENDING'
  | 'CANCELLED_INSUFFICIENT'
  | 'CANCELLED'
  | 'COMPLETED';

export type MatchingJoinExtras = {
  joinKind?: JoinKind;
  recruitClosesAt?: string | null;
  minimumPlayers?: number | null;
  targetMaleCount?: number | null;
  targetFemaleCount?: number | null;
  matchingRewardTarget?: MatchingRewardTarget | null;
  recruitmentLabel?: string | null;
  confirmedMaleCount?: number;
  confirmedFemaleCount?: number;
  storeOwnershipId?: string | null;
  /** Additive SSOT fields for matching status UX. */
  displayStatus?: StoreMatchingDisplayStatus;
  displayStatusLabel?: string;
  displaySubtitle?: string | null;
  canConfirmAttendance?: boolean;
  remainingSlots?: number;
  ownerListPriority?: number;
};

export type JoinDetailDto = {
  joinId: string;
  status: JoinStatus;
  joinMethod: JoinMethod;
  sportCode: string;
  title: string | null;
  description: string | null;
  startAt: string;
  scheduledEndAt: string;
  plannedPlayerCount: number;
  confirmedPlayerCount: number;
  availableSlots: number;
  rewardPerParticipant: string;
  roomCreationFeeAmount: string;
  rewardHoldTotalAmount: string;
  /** False once create path writes ledger (Phase J+). */
  coinAccountingPending: boolean;
  /** Opaque public share slug for Landing `/j/{shareSlug}`. */
  shareSlug?: string | null;
  /** True when the authenticated viewer has bookmarked this join. */
  bookmarked?: boolean;
  venue: {
    venueId: string;
    provider: string;
    providerPlaceId: string;
    name: string;
    address: string | null;
    regionLabel: string | null;
    latitude: number;
    longitude: number;
  };
  host: PublicUserProfileDto;
  myParticipation: JoinParticipantDto | null;
  participants: JoinParticipantDto[];
  /** Present when viewer is host or participant with settlement rows. */
  settlement?: JoinSettlementSummaryDto | null;
} & MatchingJoinExtras;

export type JoinListItemDto = {
  joinId: string;
  status: JoinStatus;
  joinMethod: JoinMethod;
  startAt: string;
  scheduledEndAt: string;
  plannedPlayerCount: number;
  confirmedPlayerCount: number;
  availableSlots: number;
  rewardPerParticipant: string;
  venueName: string;
  hostNickname: string;
  myRole: ParticipantRole | null;
  myParticipationStatus: ParticipationStatus | null;
  pendingApplicantCount: number;
} & MatchingJoinExtras;

export type CreateStoreOwnershipRequest = {
  golfFacilityId: string;
  applicantName: string;
  applicantPhone: string;
  relation: StoreOwnerRelation;
  memo?: string;
  businessRegistrationNo?: string;
};

export type StoreOwnershipRequestDto = {
  id: string;
  golfFacilityId: string;
  facilityName: string;
  facilityAddress: string | null;
  applicantName: string;
  applicantPhone: string;
  relation: StoreOwnerRelation;
  memo: string | null;
  businessRegistrationNo: string | null;
  status: StoreVerificationStatus;
  rejectReason: string | null;
  adminNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StoreOwnershipDto = {
  id: string;
  golfFacilityId: string;
  facilityName: string;
  facilityAddress: string | null;
  venueId: string | null;
  status: StoreOwnershipStatus;
  approvedAt: string;
  walletAvailable?: string;
  walletHeld?: string;
};

export type CreateStoreMatchingJoinRequest = {
  storeOwnershipId: string;
  startAt: string;
  recruitClosesAt: string;
  targetMaleCount: number;
  targetFemaleCount: number;
  minimumPlayers: number;
  matchingRewardTarget: MatchingRewardTarget;
  rewardPerParticipant: string;
  title?: string | null;
  description?: string | null;
  idempotencyKey?: string;
};

export type StoreMatchingCompleteRequest = {
  attendance: Array<{ participantId: string; attended: boolean }>;
};

export type RejectStoreVerificationRequest = {
  rejectReason: string;
  adminNote?: string;
};

/** Admin approved-store KPI period filter. */
export type AdminStoreKpiPeriod = 'all' | '30d' | '90d';

export type StoreOwnershipKpiDto = {
  attemptCount: number;
  succeededCount: number;
  cancelledCount: number;
  successRatePercent: number | null;
  participantSum: number;
  recruitingCount: number;
  scheduledCount: number;
  completedCount: number;
  lastJoinAt: string | null;
  lastSucceededAt: string | null;
};

export type AdminStoreListItemDto = {
  ownershipId: string;
  golfFacilityId: string;
  facilityName: string;
  facilityAddress: string | null;
  sido: string | null;
  sigungu: string | null;
  ownerUserId: string;
  ownerName: string | null;
  ownerPhone: string | null;
  status: StoreOwnershipStatus;
  approvedAt: string;
  kpi: StoreOwnershipKpiDto;
};

export type AdminStoreJoinRowDto = {
  joinId: string;
  startAt: string;
  status: JoinStatus;
  plannedPlayerCount: number;
  confirmedPlayerCount: number;
  attendedCount: number | null;
  succeeded: boolean;
};

export type AdminStoreDetailDto = {
  ownership: AdminStoreListItemDto;
  applicantName: string | null;
  applicantPhone: string | null;
  relation: StoreOwnerRelation | null;
  requestId: string | null;
  venueId: string | null;
  period: AdminStoreKpiPeriod;
  recentJoins: AdminStoreJoinRowDto[];
};







export type MyJoinsResponse = {
  hosted: JoinListItemDto[];
  participating: JoinListItemDto[];
};

/** Weekly + regional join discovery (participant explore). */
export type JoinDiscoveryRegionMode = 'NEARBY' | 'DISTRICT';
export type JoinDiscoverySort = 'TIME' | 'DISTANCE';
export type JoinDiscoveryJoinability = 'ALL' | 'JOINABLE';

export type DiscoverJoinCardDto = {
  joinId: string;
  status: JoinStatus;
  startAt: string;
  scheduledEndAt: string;
  venueId: string;
  venueName: string;
  regionLabel: string | null;
  sido: string | null;
  sigungu: string | null;
  latitude: number;
  longitude: number;
  distanceMeters: number | null;
  currentParticipants: number;
  maxParticipants: number;
  availableSlots: number;
  rewardPerParticipant: string;
  hostNickname: string;
  isHost: boolean;
  isParticipant: boolean;
  canJoin: boolean;
  canJoinState: 'JOINABLE' | 'FULL' | 'ALREADY_JOINED' | 'HOST' | 'UNAVAILABLE';
  ctaLabel: string | null;
  golfFacilityId: string | null;
} & MatchingJoinExtras;

export type DiscoverJoinsResponse = {
  date: string;
  regionMode: JoinDiscoveryRegionMode;
  regionLabel: string;
  sort: JoinDiscoverySort;
  joinability: JoinDiscoveryJoinability;
  ongoing: DiscoverJoinCardDto[];
  upcoming: DiscoverJoinCardDto[];
  totalCount: number;
};

export type DiscoverWeeklyCountItemDto = {
  date: string;
  count: number;
};

export type DiscoverWeeklyCountsResponse = {
  weekStart: string;
  weekEnd: string;
  regionMode: JoinDiscoveryRegionMode;
  regionLabel: string;
  days: DiscoverWeeklyCountItemDto[];
};

export type DiscoverRegionSummaryItemDto = {
  sido: string;
  sigungu?: string;
  label: string;
  count: number;
  hasChildren: boolean;
};

export type DiscoverRegionSummaryResponse = {
  date: string;
  joinability: JoinDiscoveryJoinability;
  parentSido?: string;
  parentSigungu?: string;
  items: DiscoverRegionSummaryItemDto[];
};

export type DiscoverFacilityJoinItemDto = {
  venueId: string;
  venueName: string;
  golfFacilityId: string | null;
  sido: string | null;
  sigungu: string | null;
  distanceMeters: number | null;
  joinCount: number;
  startTimes: string[];
};

export type DiscoverFacilityJoinsResponse = {
  date: string;
  regionLabel: string;
  totalJoinCount: number;
  facilities: DiscoverFacilityJoinItemDto[];
};

export type AdminDistrictDto = {
  sido: string;
  sigungu: string;
  label: string;
};

export type AdminSidoGroupDto = {
  sido: string;
  label: string;
  districts: AdminDistrictDto[];
};

export type AdminDistrictCatalogResponse = {
  groups: AdminSidoGroupDto[];
};

export type UserJoinRegionPreferenceDto = {
  id: string;
  sido: string;
  sigungu: string;
  label: string;
  sortOrder: number;
  createdAt: string;
};

export type UserJoinRegionPreferenceListResponse = {
  items: UserJoinRegionPreferenceDto[];
};

export type UpsertUserJoinRegionPreferenceRequest = {
  sido: string;
  sigungu: string;
  label?: string;
};

/** Push / in-app notification (Phase R). */
export enum NotificationType {
  JOIN_APPLICATION_RECEIVED = 'JOIN_APPLICATION_RECEIVED',
  JOIN_APPLICATION_APPROVED = 'JOIN_APPLICATION_APPROVED',
  JOIN_APPLICATION_REJECTED = 'JOIN_APPLICATION_REJECTED',
  SETTLEMENT_CONFIRMATION_REQUIRED = 'SETTLEMENT_CONFIRMATION_REQUIRED',
  REWARD_PAID = 'REWARD_PAID',
  REWARD_AUTO_PAID = 'REWARD_AUTO_PAID',
  DISPUTE_OPENED = 'DISPUTE_OPENED',
  DISPUTE_RESOLVED = 'DISPUTE_RESOLVED',
  JOIN_CANCELLED = 'JOIN_CANCELLED',
  JOIN_UPDATED = 'JOIN_UPDATED',
  JOIN_ALERT_MATCH = 'JOIN_ALERT_MATCH',
  FOLLOWED_STORE_NEW_JOIN = 'FOLLOWED_STORE_NEW_JOIN',
  BOOKMARK_JOIN_CLOSING = 'BOOKMARK_JOIN_CLOSING',
  BOOKMARK_JOIN_SPOT_LEFT = 'BOOKMARK_JOIN_SPOT_LEFT',
  BOOKMARK_JOIN_UPDATED = 'BOOKMARK_JOIN_UPDATED',
  BOOKMARK_JOIN_CANCELLED = 'BOOKMARK_JOIN_CANCELLED',
}

export enum JoinAlertDateMode {
  TODAY = 'TODAY',
  THIS_WEEK = 'THIS_WEEK',
  SPECIFIC_DATE = 'SPECIFIC_DATE',
}

export enum JoinAlertTimeBand {
  ANY = 'ANY',
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  EVENING = 'EVENING',
}

export enum PushPlatform {
  ANDROID = 'ANDROID',
  IOS = 'IOS',
  WEB = 'WEB',
}

export type RegisterPushDeviceRequest = {
  pushToken: string;
  platform: PushPlatform;
  deviceId?: string | null;
};

export type PushDeviceDto = {
  id: string;
  platform: PushPlatform;
  active: boolean;
  lastSeenAt: string;
  createdAt: string;
};

export type NotificationDataDto = {
  type: NotificationType;
  joinId?: string;
  settlementId?: string;
  disputeId?: string;
  participantId?: string;
  rewardAmount?: string;
};

export type AppNotificationDto = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: NotificationDataDto;
  readAt: string | null;
  createdAt: string;
};

export type NotificationListResponse = {
  items: AppNotificationDto[];
  nextCursor: string | null;
  unreadCount: number;
};

export type NotificationPreferenceDto = {
  pushEnabled: boolean;
};

/** Aliases used by API services */
export type AppNotificationDtoAlias = AppNotificationDto;
export type NotificationListResponseAlias = NotificationListResponse;

/* ─── HQ Coin Supply / Issuance ─── */

export type CoinSupplyKpiDto = {
  /** Historical mint total (includes DEV_SEED). */
  totalIssued: string;
  /** totalIssued − DEV_SEED (ops view). */
  productionIssued: string;
  currentSupply: string;
  totalAvailable: string;
  totalHeld: string;
  totalBurned: string;
  todayIssued: string;
  monthIssued: string;
  /** When true, today/month/breakdown omit DEV_SEED. */
  excludeDevSeed: boolean;
  /** Always computed with full issued (include DEV_SEED). */
  identityOk: boolean;
  identityDelta: string;
};

export type CoinIssuanceBreakdownItemDto = {
  issuanceType: CoinIssuanceType;
  amount: string;
};

export type CoinSupplyDashboardDto = {
  kpi: CoinSupplyKpiDto;
  breakdown: CoinIssuanceBreakdownItemDto[];
};

export type CoinIssuanceListItemDto = {
  issuanceId: string;
  createdAt: string;
  userId: string;
  userNickname: string | null;
  amount: string;
  issuanceType: CoinIssuanceType;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdByUserId: string | null;
  createdByLabel: string;
  status: CoinIssuanceStatus;
  ledgerTxId: string;
};

export type CoinIssuanceListResponse = {
  items: CoinIssuanceListItemDto[];
  nextCursor: string | null;
};

export type CoinIssuanceDetailDto = CoinIssuanceListItemDto & {
  metadata: Record<string, unknown> | null;
};

export type AdminManualIssuanceRequest = {
  userId: string;
  amount: string;
  issuanceType: CoinIssuanceType.ADMIN_GRANT | CoinIssuanceType.CUSTOMER_SUPPORT | CoinIssuanceType.OTHER | CoinIssuanceType.PROMOTION | CoinIssuanceType.EVENT_REWARD;
  reason: string;
  idempotencyKey: string;
  referenceType?: string;
  referenceId?: string;
};

export type AdminManualIssuanceResponse = {
  issuanceId: string;
  ledgerTxId: string;
  amount: string;
  alreadyExists: boolean;
};

export type CoinSupplyReconciliationDto = {
  ok: boolean;
  totalIssued: string;
  totalBurned: string;
  currentSupplyFromBooks: string;
  totalAvailable: string;
  totalHeld: string;
  currentSupplyFromWallets: string;
  delta: string;
  excludeDevSeed: boolean;
  /** Never auto-fix — operator must investigate. */
  autoFixAllowed: false;
};

export type AdminUserCoinHistoryDto = {
  userId: string;
  nickname: string | null;
  availableCoin: string;
  heldCoin: string;
  /** Sum of CoinIssuance to this user (new mints only). */
  lifetimeIssuedReceived: string;
  /** Sum of JOIN_REWARD_TRANSFER credits (not issuance). */
  lifetimeTransferReceived: string;
  /** Sum of ROOM_CREATION_FEE debits (burn contribution). */
  lifetimeBurnContributed: string;
  recentTransactions: WalletTransactionDto[];
};

export type AttendanceReliabilityDto = {
  completedJoinCount: number;
  noShowCount: number;
  attendanceRatePercent: number | null;
};

export type JoinAlertSubscriptionDto = {
  id: string;
  label: string | null;
  sido: string | null;
  sigungu: string | null;
  dateMode: JoinAlertDateMode;
  specificDate: string | null;
  timeBand: JoinAlertTimeBand;
  joinableOnly: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateJoinAlertSubscriptionRequest = {
  label?: string;
  sido?: string;
  sigungu?: string;
  dateMode: JoinAlertDateMode;
  specificDate?: string;
  timeBand?: JoinAlertTimeBand;
  joinableOnly?: boolean;
};

export type UpdateJoinAlertSubscriptionRequest = Partial<CreateJoinAlertSubscriptionRequest> & {
  enabled?: boolean;
};

export type JoinBookmarkDto = {
  id: string;
  joinId: string;
  createdAt: string;
  join: JoinListItemDto;
};

export type GolfFacilityFollowDto = {
  id: string;
  golfFacilityId: string;
  createdAt: string;
  displayName: string;
  sido: string | null;
  sigungu: string | null;
  todayJoinableCount: number;
  weekJoinableCount: number;
};

export type PublicJoinShareDto = {
  shareSlug: string;
  joinId: string;
  status: JoinStatus;
  statusLabel: string;
  venueName: string;
  regionLabel: string | null;
  startAt: string;
  scheduledEndAt: string;
  plannedPlayerCount: number;
  confirmedPlayerCount: number;
  availableSlots: number;
  joinKind: JoinKind;
  title: string | null;
  description: string | null;
  isJoinable: boolean;
  appDeepLink: string;
};

export type JoinPrefillDto = {
  sourceJoinId: string;
  venueId: string;
  golfFacilityId: string | null;
  title: string | null;
  description: string | null;
  plannedPlayerCount: number;
  targetMaleCount: number | null;
  targetFemaleCount: number | null;
  rewardPerParticipant: string;
  joinKind: JoinKind;
  matchingRewardTarget: string | null;
  storeOwnershipId: string | null;
  minimumPlayers: number | null;
};

export type FacilityWeeklyJoinsResponse = {
  golfFacilityId: string;
  weekDays: Array<{ date: string; weekdayLabel: string; count: number; isToday: boolean }>;
  selectedDate: string;
  joins: JoinListItemDto[];
};
