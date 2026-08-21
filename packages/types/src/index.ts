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
}

export enum JoinMethod {
  OPEN = 'OPEN',
  APPROVAL = 'APPROVAL',
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
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
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

export type WalletSummaryDto = {
  availableCoin: string;
  heldCoin: string;
  recentTransactions: Array<{
    id: string;
    label: string;
    amount: string;
    createdAt: string;
  }>;
};

export type MeDto = {
  userId: string;
  authAppHints: {
    termsAccepted: boolean;
    profileComplete: boolean;
    hasAvatar: boolean;
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

export type SocialSignInResponse = {
  session: AuthSessionDto;
  me: MeDto;
  nextStep:
    | 'HOME'
    | 'TERMS'
    | 'IDENTITY'
    | 'PROFILE_SETUP'
    | 'PROFILE_PHOTO';
};

export const DEFAULT_LOCALE = 'ko-KR';
export const DEFAULT_COUNTRY = 'KR';
export const DEFAULT_TIMEZONE = 'Asia/Seoul';
export const DEFAULT_CURRENCY = 'KRW';
export const SCREEN_GOLF_CODE = 'SCREEN_GOLF';

/** Presence visibility — OS location permission is a separate concept. */
export enum PresenceVisibility {
  HIDDEN = 'HIDDEN',
  AVAILABLE = 'AVAILABLE',
}

export type PresenceDurationOption = '1h' | '2h' | 'today';

export type ExploreFilter = 'ALL' | 'VENUE' | 'USER' | 'TODAY_JOIN';

export type ExploreJoinPreviewDto = {
  joinId: string;
  startAt: string;
  scheduledEndAt: string;
  currentParticipants: number;
  maxParticipants: number;
  rewardCoin: string;
  hostNickname: string;
  hostVerified: boolean;
};

/** Venue source for Explore — Kakao live search never implies DB persistence. */
export type ExploreVenueSource = 'KAKAO_LOCAL' | 'MOCK' | 'JJOIN';

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
  joinPreviews: ExploreJoinPreviewDto[];
  source?: ExploreVenueSource;
  /** True when Create Join from this card is supported in current product phase. */
  canCreateJoin?: boolean;
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

export type CreateJoinRequest = {
  sportCode: string;
  venue: JoinVenueRefInput;
  startAt: string;
  plannedPlayerCount: number;
  joinMethod: JoinMethod;
  title?: string | null;
  description?: string | null;
  /**
   * Display snapshot only.
   * COIN_ACCOUNTING_PENDING — no wallet debit / hold in Phase F.
   */
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
  /** Always true in Phase F — ledger not executed. */
  coinAccountingPending: true;
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
};

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
};

export type MyJoinsResponse = {
  hosted: JoinListItemDto[];
  participating: JoinListItemDto[];
};
