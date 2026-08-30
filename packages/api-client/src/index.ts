import {
  MockAuthScenario,
  SocialProvider,
  type ActivateGolfFacilityVenueResponse,
  type ActivateVenueRequest,
  type ActivateVenueResponse,
  type AddUserVenueFavoriteRequest,
  type AuthSessionDto,
  type CreateCustomVenueRequest,
  type CreateJoinRequest,
  type CreateStoreMatchingJoinRequest,
  type CreateStoreOwnershipRequest,
  type ExploreFilter,
  type ExploreMapResponse,
  type GolfFacilityBoundsResponse,
  type GolfFacilityMapDto,
  type GolfFacilitySearchResponse,
  type JoinCoinPreviewDto,
  type JoinCoinPreviewRequest,
  type JoinDetailDto,
  type JoinListItemDto,
  type JoinSettlementSummaryDto,
  type MeDto,
  type MyJoinsResponse,
  type PrivateIdentityDto,
  type PrivatePresenceDto,
  type PublicUserProfileDto,
  type SocialSignInRequest,
  type SocialSignInResponse,
  type SportSkillLevel,
  type UpsertPresenceRequest,
  type UserVenueListResponse,
  type WalletSummaryDto,
  type WalletTransactionsResponse,
  type SettlementIssueRequest,
  type DisputeStatementRequest,
  type DisputeParticipantDto,
  type AdminDisputeListResponse,
  type AdminDisputeDetailDto,
  type AdminResolveDisputeRequest,
  type DisputeStatus,
  type RegisterPushDeviceRequest,
  type RejectStoreVerificationRequest,
  type PushDeviceDto,
  type NotificationListResponse,
  type AppNotificationDto,
  type NotificationPreferenceDto,
  type CoinSupplyDashboardDto,
  type CoinSupplyReconciliationDto,
  type CoinIssuanceListResponse,
  type CoinIssuanceDetailDto,
  type AdminManualIssuanceRequest,
  type AdminManualIssuanceResponse,
  type AdminUserCoinHistoryDto,
  type CoinIssuanceType,
  type DiscoverJoinsResponse,
  type DiscoverWeeklyCountsResponse,
  type DiscoverRegionSummaryResponse,
  type DiscoverFacilityJoinsResponse,
  type AdminDistrictCatalogResponse,
  type UserJoinRegionPreferenceListResponse,
  type UserJoinRegionPreferenceDto,
  type UpsertUserJoinRegionPreferenceRequest,
  type JoinDiscoveryRegionMode,
  type JoinDiscoverySort,
  type JoinDiscoveryJoinability,
  type StoreMatchingCompleteRequest,
  type StoreOwnershipDto,
  type StoreOwnershipRequestDto,
  type StoreVerificationStatus,
  type JoinAlertSubscriptionDto,
  type CreateJoinAlertSubscriptionRequest,
  type UpdateJoinAlertSubscriptionRequest,
  type JoinBookmarkDto,
  type GolfFacilityFollowDto,
  type PublicJoinShareDto,
  type JoinPrefillDto,
  type FacilityWeeklyJoinsResponse,
} from '@jjoin/types';

export type ApiClientConfig = {
  baseUrl: string;
  getAccessToken?: () => string | null | Promise<string | null>;
};

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    const snippet = text.replace(/\s+/g, ' ').slice(0, 120);
    throw new Error(`api_error:${res.status}:${snippet}`);
  }
  return (await res.json()) as T;
}

async function request(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'fetch_failed';
    throw new Error(`network_error:${msg}`);
  }
}

export class ApiClient {
  constructor(private readonly config: ApiClientConfig) {}

  private async headers(auth = true): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (auth && this.config.getAccessToken) {
      const token = await this.config.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  async getHealth(): Promise<{ status: string }> {
    const res = await request(`${this.config.baseUrl}/health`);
    return parseJson(res);
  }

  async mockSocialSignIn(body: SocialSignInRequest): Promise<SocialSignInResponse> {
    const res = await request(`${this.config.baseUrl}/auth/social/mock-sign-in`, {
      method: 'POST',
      headers: await this.headers(false),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async socialExchange(body: {
    provider: SocialProvider;
    credential: string;
  }): Promise<SocialSignInResponse> {
    const res = await request(`${this.config.baseUrl}/auth/social/exchange`, {
      method: 'POST',
      headers: await this.headers(false),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async getSession(): Promise<{ userId: string; me: MeDto }> {
    const res = await request(`${this.config.baseUrl}/auth/session`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async logout(): Promise<{ ok: boolean }> {
    const res = await request(`${this.config.baseUrl}/auth/logout`, {
      method: 'POST',
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async getMe(): Promise<MeDto> {
    const res = await request(`${this.config.baseUrl}/me`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async acceptTerms(body: unknown): Promise<MeDto> {
    const res = await request(`${this.config.baseUrl}/me/terms`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async setupProfile(body: unknown): Promise<MeDto> {
    const res = await request(`${this.config.baseUrl}/me/profile/setup`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async editProfile(body: unknown): Promise<MeDto> {
    const res = await request(`${this.config.baseUrl}/me/profile`, {
      method: 'PATCH',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async setAvatar(body: { localUri?: string | null; skip?: boolean }): Promise<MeDto> {
    const res = await request(`${this.config.baseUrl}/me/profile/avatar`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async completeLocationOnboarding(): Promise<MeDto> {
    const res = await request(`${this.config.baseUrl}/me/onboarding/location`, {
      method: 'POST',
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async getIdentityStatus(): Promise<PrivateIdentityDto> {
    const res = await request(`${this.config.baseUrl}/me/identity-status`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async getIdentityCapability(): Promise<{
    status: 'MOCK' | 'REAL' | 'UNAVAILABLE';
    canStart: boolean;
    message: string | null;
  }> {
    const res = await request(`${this.config.baseUrl}/me/identity/capability`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async startIdentity(): Promise<{ sessionId: string }> {
    const res = await request(`${this.config.baseUrl}/me/identity/start`, {
      method: 'POST',
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async confirmIdentity(body: {
    sessionId: string;
    outcome?: 'success' | 'fail';
  }): Promise<MeDto> {
    const res = await request(`${this.config.baseUrl}/me/identity/confirm`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async cancelIdentity(body: { sessionId: string }): Promise<MeDto> {
    const res = await request(`${this.config.baseUrl}/me/identity/cancel`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async getPublicProfile(userId: string): Promise<PublicUserProfileDto> {
    const res = await request(`${this.config.baseUrl}/users/${userId}/public-profile`, {
      headers: await this.headers(false),
    });
    return parseJson(res);
  }

  async getWalletSummary(): Promise<WalletSummaryDto> {
    const res = await request(`${this.config.baseUrl}/me/wallet/summary`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async getWallet(): Promise<WalletSummaryDto> {
    const res = await request(`${this.config.baseUrl}/me/wallet`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async getWalletTransactions(query?: {
    cursor?: string;
    limit?: number;
  }): Promise<WalletTransactionsResponse> {
    const params = new URLSearchParams();
    if (query?.cursor) params.set('cursor', query.cursor);
    if (query?.limit != null) params.set('limit', String(query.limit));
    const qs = params.toString();
    const res = await request(
      `${this.config.baseUrl}/me/wallet/transactions${qs ? `?${qs}` : ''}`,
      { headers: await this.headers(true) },
    );
    return parseJson(res);
  }

  async previewJoinCoin(body: JoinCoinPreviewRequest): Promise<JoinCoinPreviewDto> {
    const res = await request(`${this.config.baseUrl}/joins/coin-preview`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async patchSportProfile(
    sportCode: string,
    body: { skillLevel: SportSkillLevel },
  ): Promise<MeDto> {
    const res = await request(`${this.config.baseUrl}/me/sport-profiles/${sportCode}`, {
      method: 'PATCH',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async getExploreMap(query: {
    sportCode?: string;
    filter?: ExploreFilter;
    query?: string;
    centerLat?: number;
    centerLng?: number;
    southWestLat?: number;
    southWestLng?: number;
    northEastLat?: number;
    northEastLng?: number;
  }): Promise<ExploreMapResponse> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v != null && v !== '') params.set(k, String(v));
    });
    const qs = params.toString();
    const res = await request(`${this.config.baseUrl}/explore/map${qs ? `?${qs}` : ''}`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async getMyPresence(): Promise<PrivatePresenceDto> {
    const res = await request(`${this.config.baseUrl}/me/presence`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async putMyPresence(body: UpsertPresenceRequest): Promise<PrivatePresenceDto> {
    const res = await request(`${this.config.baseUrl}/me/presence`, {
      method: 'PUT',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async deleteMyPresence(): Promise<PrivatePresenceDto> {
    const res = await request(`${this.config.baseUrl}/me/presence`, {
      method: 'DELETE',
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async activateVenue(body: ActivateVenueRequest): Promise<ActivateVenueResponse> {
    const res = await request(`${this.config.baseUrl}/venues/activate`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  /** Viewport GolfFacility markers — no Venue side effects. */
  async getGolfFacilitiesInBounds(query: {
    north: number;
    south: number;
    east: number;
    west: number;
    limit?: number;
    date?: string;
    regionMode?: JoinDiscoveryRegionMode;
    sido?: string;
    sigungu?: string;
    lat?: number;
    lng?: number;
    radiusMeters?: number;
  }): Promise<GolfFacilityBoundsResponse> {
    const params = new URLSearchParams();
    params.set('north', String(query.north));
    params.set('south', String(query.south));
    params.set('east', String(query.east));
    params.set('west', String(query.west));
    if (query.limit != null) params.set('limit', String(query.limit));
    if (query.date) params.set('date', query.date);
    if (query.regionMode) params.set('regionMode', query.regionMode);
    if (query.sido) params.set('sido', query.sido);
    if (query.sigungu) params.set('sigungu', query.sigungu);
    if (query.lat != null) params.set('lat', String(query.lat));
    if (query.lng != null) params.set('lng', String(query.lng));
    if (query.radiusMeters != null) {
      params.set('radiusMeters', String(query.radiusMeters));
    }
    const res = await request(
      `${this.config.baseUrl}/golf-facilities?${params.toString()}`,
      { headers: await this.headers(true) },
    );
    return parseJson(res);
  }

  async getDiscoverJoins(
    query: {
      date: string;
      regionMode: JoinDiscoveryRegionMode;
      lat?: number;
      lng?: number;
      radiusMeters?: number;
      sido?: string;
      sigungu?: string;
      sort?: JoinDiscoverySort;
      joinability?: JoinDiscoveryJoinability;
    },
    signal?: AbortSignal,
  ): Promise<DiscoverJoinsResponse> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v != null && v !== '') params.set(k, String(v));
    });
    const res = await request(
      `${this.config.baseUrl}/joins/discover?${params.toString()}`,
      { headers: await this.headers(true), signal },
    );
    return parseJson(res);
  }

  async getDiscoverWeeklyCounts(
    query: {
      weekStart: string;
      regionMode: JoinDiscoveryRegionMode;
      lat?: number;
      lng?: number;
      radiusMeters?: number;
      sido?: string;
      sigungu?: string;
    },
    signal?: AbortSignal,
  ): Promise<DiscoverWeeklyCountsResponse> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v != null && v !== '') params.set(k, String(v));
    });
    const res = await request(
      `${this.config.baseUrl}/joins/discover/weekly?${params.toString()}`,
      { headers: await this.headers(true), signal },
    );
    return parseJson(res);
  }

  async getDiscoverRegionSummary(
    query: {
      date: string;
      joinability?: JoinDiscoveryJoinability;
      sido?: string;
      sigungu?: string;
    },
    signal?: AbortSignal,
  ): Promise<DiscoverRegionSummaryResponse> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v != null && v !== '') params.set(k, String(v));
    });
    const res = await request(
      `${this.config.baseUrl}/joins/discover/region-summary?${params.toString()}`,
      { headers: await this.headers(true), signal },
    );
    return parseJson(res);
  }

  async getDiscoverFacilityJoins(
    query: {
      date: string;
      joinability?: JoinDiscoveryJoinability;
      regionMode: JoinDiscoveryRegionMode;
      lat?: number;
      lng?: number;
      radiusMeters?: number;
      sido?: string;
      sigungu?: string;
      sort?: JoinDiscoverySort;
    },
    signal?: AbortSignal,
  ): Promise<DiscoverFacilityJoinsResponse> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v != null && v !== '') params.set(k, String(v));
    });
    const res = await request(
      `${this.config.baseUrl}/joins/discover/facilities?${params.toString()}`,
      { headers: await this.headers(true), signal },
    );
    return parseJson(res);
  }

  async getRegionDistricts(): Promise<AdminDistrictCatalogResponse> {
    const res = await request(`${this.config.baseUrl}/regions/districts`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async getMyJoinRegions(): Promise<UserJoinRegionPreferenceListResponse> {
    const res = await request(`${this.config.baseUrl}/me/join-regions`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async addMyJoinRegion(
    body: UpsertUserJoinRegionPreferenceRequest,
  ): Promise<UserJoinRegionPreferenceDto> {
    const res = await request(`${this.config.baseUrl}/me/join-regions`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async removeMyJoinRegion(id: string): Promise<{ ok: true }> {
    const res = await request(`${this.config.baseUrl}/me/join-regions/${id}`, {
      method: 'DELETE',
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  /** Search GolfFacility master — no Venue side effects. */
  async searchGolfFacilities(query: {
    q?: string;
    sido?: string;
    sigungu?: string;
    screenOnly?: boolean;
    limit?: number;
    cursor?: string;
  }): Promise<GolfFacilitySearchResponse> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v == null || v === '') return;
      if (k === 'screenOnly') {
        if (v) params.set(k, 'true');
        return;
      }
      params.set(k, String(v));
    });
    const res = await request(
      `${this.config.baseUrl}/golf-facilities/search?${params.toString()}`,
      { headers: await this.headers(true) },
    );
    return parseJson(res);
  }

  async getGolfFacility(id: string): Promise<GolfFacilityMapDto> {
    const res = await request(`${this.config.baseUrl}/golf-facilities/${id}`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  /** Explicit Join place activation from GolfFacility (writes Venue once). */
  async activateGolfFacilityVenue(
    golfFacilityId: string,
  ): Promise<ActivateGolfFacilityVenueResponse> {
    const res = await request(
      `${this.config.baseUrl}/golf-facilities/${golfFacilityId}/activate-venue`,
      {
        method: 'POST',
        headers: await this.headers(true),
      },
    );
    return parseJson(res);
  }

  async getVenue(venueId: string): Promise<ActivateVenueResponse> {
    const res = await request(`${this.config.baseUrl}/venues/${venueId}`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async getMyRecentVenues(): Promise<UserVenueListResponse> {
    const res = await request(`${this.config.baseUrl}/me/venues/recent`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async getMyFavoriteVenues(): Promise<UserVenueListResponse> {
    const res = await request(`${this.config.baseUrl}/me/venues/favorites`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async addVenueFavorite(body: AddUserVenueFavoriteRequest): Promise<{ ok: true }> {
    const res = await request(`${this.config.baseUrl}/me/venues/favorites`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async removeVenueFavorite(venueId: string): Promise<{ ok: true }> {
    const res = await request(`${this.config.baseUrl}/me/venues/favorites/${venueId}`, {
      method: 'DELETE',
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async createCustomVenue(body: CreateCustomVenueRequest): Promise<{
    venueId: string;
    name: string;
    address: string | null;
    roadAddress: string | null;
    phone: string | null;
    latitude: number;
    longitude: number;
  }> {
    const res = await request(`${this.config.baseUrl}/me/venues/custom`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async createJoin(body: CreateJoinRequest): Promise<JoinDetailDto> {
    const res = await request(`${this.config.baseUrl}/joins`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async getJoin(joinId: string): Promise<JoinDetailDto> {
    const res = await request(`${this.config.baseUrl}/joins/${joinId}`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async getMyJoins(): Promise<MyJoinsResponse> {
    const res = await request(`${this.config.baseUrl}/joins/mine`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async applyJoin(joinId: string): Promise<JoinDetailDto> {
    const res = await request(`${this.config.baseUrl}/joins/${joinId}/apply`, {
      method: 'POST',
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async approveParticipant(joinId: string, participantId: string): Promise<JoinDetailDto> {
    const res = await request(
      `${this.config.baseUrl}/joins/${joinId}/participants/${participantId}/approve`,
      {
        method: 'POST',
        headers: await this.headers(true),
      },
    );
    return parseJson(res);
  }

  async getJoinSettlements(joinId: string): Promise<JoinSettlementSummaryDto> {
    const res = await request(`${this.config.baseUrl}/joins/${joinId}/settlements`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async paySettlementParticipant(joinId: string, participantId: string): Promise<{
    ok: boolean;
    settlementId?: string;
    rewardStatus?: string;
    skipped?: boolean;
  }> {
    const res = await request(
      `${this.config.baseUrl}/joins/${joinId}/settlements/${participantId}/pay`,
      {
        method: 'POST',
        headers: await this.headers(true),
      },
    );
    return parseJson(res);
  }

  async payAllSettlements(joinId: string): Promise<{
    count: number;
    results: Array<{ ok: boolean; skipped?: boolean }>;
  }> {
    const res = await request(`${this.config.baseUrl}/joins/${joinId}/settlements/pay-all`, {
      method: 'POST',
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async reportSettlementIssue(
    joinId: string,
    participantId: string,
    body: SettlementIssueRequest,
  ): Promise<{ ok: boolean; rewardStatus?: string; alreadyTerminal?: boolean; disputeId?: string }> {
    const res = await request(
      `${this.config.baseUrl}/joins/${joinId}/settlements/${participantId}/issue`,
      {
        method: 'POST',
        headers: await this.headers(true),
        body: JSON.stringify(body),
      },
    );
    return parseJson(res);
  }

  /** DEV/mock QA — advance settlement clock (host only). */
  async qaAdvanceSettlementClock(
    joinId: string,
    mode: 'open' | 'autopay' = 'open',
  ): Promise<{ ok: boolean; mode: string }> {
    const res = await request(`${this.config.baseUrl}/joins/${joinId}/settlements/_qa/advance-clock`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify({ mode }),
    });
    return parseJson(res);
  }

  async getMyDispute(disputeId: string): Promise<DisputeParticipantDto> {
    const res = await request(`${this.config.baseUrl}/me/disputes/${disputeId}`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async submitDisputeStatement(
    disputeId: string,
    body: DisputeStatementRequest,
  ): Promise<{ id: string }> {
    const res = await request(`${this.config.baseUrl}/me/disputes/${disputeId}/statement`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async listAdminDisputes(query?: {
    status?: DisputeStatus;
    cursor?: string;
    limit?: number;
  }): Promise<AdminDisputeListResponse> {
    const params = new URLSearchParams();
    if (query?.status) params.set('status', query.status);
    if (query?.cursor) params.set('cursor', query.cursor);
    if (query?.limit != null) params.set('limit', String(query.limit));
    const qs = params.toString();
    const res = await request(`${this.config.baseUrl}/admin/disputes${qs ? `?${qs}` : ''}`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async getAdminDispute(disputeId: string): Promise<AdminDisputeDetailDto> {
    const res = await request(`${this.config.baseUrl}/admin/disputes/${disputeId}`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async resolveAdminDispute(
    disputeId: string,
    body: AdminResolveDisputeRequest,
  ): Promise<{ ok: boolean; resolution?: string; rewardStatus?: string; alreadyResolved?: boolean }> {
    const res = await request(`${this.config.baseUrl}/admin/disputes/${disputeId}/resolve`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async getAdminCoinSupply(query?: {
    excludeDevSeed?: boolean;
  }): Promise<CoinSupplyDashboardDto> {
    const params = new URLSearchParams();
    if (query?.excludeDevSeed) params.set('excludeDevSeed', '1');
    const qs = params.toString();
    const res = await request(`${this.config.baseUrl}/admin/coin/supply${qs ? `?${qs}` : ''}`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async reconcileAdminCoinSupply(): Promise<CoinSupplyReconciliationDto> {
    const res = await request(`${this.config.baseUrl}/admin/coin/supply/reconcile`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async listAdminCoinIssuances(query?: {
    issuanceType?: CoinIssuanceType;
    from?: string;
    to?: string;
    userId?: string;
    excludeDevSeed?: boolean;
    cursor?: string;
    limit?: number;
  }): Promise<CoinIssuanceListResponse> {
    const params = new URLSearchParams();
    if (query?.issuanceType) params.set('issuanceType', query.issuanceType);
    if (query?.from) params.set('from', query.from);
    if (query?.to) params.set('to', query.to);
    if (query?.userId) params.set('userId', query.userId);
    if (query?.excludeDevSeed) params.set('excludeDevSeed', '1');
    if (query?.cursor) params.set('cursor', query.cursor);
    if (query?.limit != null) params.set('limit', String(query.limit));
    const qs = params.toString();
    const res = await request(`${this.config.baseUrl}/admin/coin/issuances${qs ? `?${qs}` : ''}`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async getAdminCoinIssuance(issuanceId: string): Promise<CoinIssuanceDetailDto> {
    const res = await request(`${this.config.baseUrl}/admin/coin/issuances/${issuanceId}`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async createAdminCoinIssuance(
    body: AdminManualIssuanceRequest,
  ): Promise<AdminManualIssuanceResponse> {
    const res = await request(`${this.config.baseUrl}/admin/coin/issuances`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async getAdminUserCoinHistory(userId: string): Promise<AdminUserCoinHistoryDto> {
    const res = await request(`${this.config.baseUrl}/admin/coin/users/${userId}`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async registerPushDevice(body: RegisterPushDeviceRequest): Promise<PushDeviceDto> {
    const res = await request(`${this.config.baseUrl}/me/push-devices`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async listPushDevices(): Promise<PushDeviceDto[]> {
    const res = await request(`${this.config.baseUrl}/me/push-devices`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async deactivatePushDevice(deviceId: string): Promise<{ ok: boolean }> {
    const res = await request(`${this.config.baseUrl}/me/push-devices/${deviceId}`, {
      method: 'DELETE',
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async deactivateCurrentPushDevice(pushToken: string): Promise<{ ok: boolean }> {
    const res = await request(`${this.config.baseUrl}/me/push-devices/deactivate-current`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify({ pushToken }),
    });
    return parseJson(res);
  }

  async listNotifications(query?: {
    cursor?: string;
    limit?: number;
  }): Promise<NotificationListResponse> {
    const params = new URLSearchParams();
    if (query?.cursor) params.set('cursor', query.cursor);
    if (query?.limit != null) params.set('limit', String(query.limit));
    const qs = params.toString();
    const res = await request(
      `${this.config.baseUrl}/me/notifications${qs ? `?${qs}` : ''}`,
      { headers: await this.headers(true) },
    );
    return parseJson(res);
  }

  async getNotificationUnreadCount(): Promise<{ unreadCount: number }> {
    const res = await request(`${this.config.baseUrl}/me/notifications/unread-count`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async markNotificationRead(id: string): Promise<AppNotificationDto> {
    const res = await request(`${this.config.baseUrl}/me/notifications/${id}/read`, {
      method: 'POST',
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async markAllNotificationsRead(): Promise<{ ok: boolean; count: number }> {
    const res = await request(`${this.config.baseUrl}/me/notifications/read-all`, {
      method: 'POST',
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async getNotificationPreference(): Promise<NotificationPreferenceDto> {
    const res = await request(`${this.config.baseUrl}/me/notification-preference`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async setNotificationPreference(
    body: NotificationPreferenceDto,
  ): Promise<NotificationPreferenceDto> {
    const res = await request(`${this.config.baseUrl}/me/notification-preference`, {
      method: 'PATCH',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async createStoreVerification(
    body: CreateStoreOwnershipRequest,
  ): Promise<StoreOwnershipRequestDto> {
    const res = await request(`${this.config.baseUrl}/store-verifications`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async getMyStoreVerifications(): Promise<StoreOwnershipRequestDto[]> {
    const res = await request(`${this.config.baseUrl}/store-verifications/me`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async getMyStores(query?: { includeWallet?: boolean }): Promise<StoreOwnershipDto[]> {
    const params = new URLSearchParams();
    if (query?.includeWallet) params.set('includeWallet', '1');
    const qs = params.toString();
    const res = await request(`${this.config.baseUrl}/my-stores${qs ? `?${qs}` : ''}`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async listAdminStoreVerifications(query?: {
    status?: StoreVerificationStatus;
  }): Promise<StoreOwnershipRequestDto[]> {
    const params = new URLSearchParams();
    if (query?.status) params.set('status', query.status);
    const qs = params.toString();
    const res = await request(
      `${this.config.baseUrl}/admin/store-verifications${qs ? `?${qs}` : ''}`,
      { headers: await this.headers(true) },
    );
    return parseJson(res);
  }

  async approveAdminStoreVerification(id: string): Promise<StoreOwnershipRequestDto> {
    const res = await request(`${this.config.baseUrl}/admin/store-verifications/${id}/approve`, {
      method: 'POST',
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async rejectAdminStoreVerification(
    id: string,
    body: RejectStoreVerificationRequest,
  ): Promise<StoreOwnershipRequestDto> {
    const res = await request(`${this.config.baseUrl}/admin/store-verifications/${id}/reject`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async revokeAdminStoreVerification(id: string): Promise<StoreOwnershipRequestDto> {
    const res = await request(`${this.config.baseUrl}/admin/store-verifications/${id}/revoke`, {
      method: 'POST',
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async createStoreJoin(body: CreateStoreMatchingJoinRequest): Promise<JoinDetailDto> {
    const res = await request(`${this.config.baseUrl}/store-joins`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async getMyStoreJoins(): Promise<JoinListItemDto[]> {
    const res = await request(`${this.config.baseUrl}/store-joins/mine`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async cancelStoreJoin(joinId: string): Promise<JoinDetailDto> {
    const res = await request(`${this.config.baseUrl}/store-joins/${joinId}/cancel`, {
      method: 'POST',
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async leaveStoreJoin(joinId: string): Promise<JoinDetailDto> {
    const res = await request(`${this.config.baseUrl}/store-joins/${joinId}/leave`, {
      method: 'POST',
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async completeStoreJoin(
    joinId: string,
    body: StoreMatchingCompleteRequest,
  ): Promise<JoinDetailDto> {
    const res = await request(`${this.config.baseUrl}/store-joins/${joinId}/complete`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  /* ─── Join engagement (alerts / bookmarks / follows / share) ─── */

  async listJoinAlerts(): Promise<JoinAlertSubscriptionDto[]> {
    const res = await request(`${this.config.baseUrl}/me/join-alerts`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async createJoinAlert(
    body: CreateJoinAlertSubscriptionRequest,
  ): Promise<JoinAlertSubscriptionDto> {
    const res = await request(`${this.config.baseUrl}/me/join-alerts`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async updateJoinAlert(
    id: string,
    body: UpdateJoinAlertSubscriptionRequest,
  ): Promise<JoinAlertSubscriptionDto> {
    const res = await request(`${this.config.baseUrl}/me/join-alerts/${id}`, {
      method: 'PATCH',
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  }

  async deleteJoinAlert(id: string): Promise<{ ok: true }> {
    const res = await request(`${this.config.baseUrl}/me/join-alerts/${id}`, {
      method: 'DELETE',
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async listJoinBookmarks(): Promise<JoinBookmarkDto[]> {
    const res = await request(`${this.config.baseUrl}/me/join-bookmarks`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async bookmarkJoin(joinId: string): Promise<JoinBookmarkDto> {
    const res = await request(`${this.config.baseUrl}/joins/${joinId}/bookmark`, {
      method: 'POST',
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async unbookmarkJoin(joinId: string): Promise<{ ok: true }> {
    const res = await request(`${this.config.baseUrl}/joins/${joinId}/bookmark`, {
      method: 'DELETE',
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async listFacilityFollows(): Promise<GolfFacilityFollowDto[]> {
    const res = await request(`${this.config.baseUrl}/me/facility-follows`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async followFacility(golfFacilityId: string): Promise<GolfFacilityFollowDto> {
    const res = await request(
      `${this.config.baseUrl}/golf-facilities/${golfFacilityId}/follow`,
      {
        method: 'POST',
        headers: await this.headers(true),
      },
    );
    return parseJson(res);
  }

  async unfollowFacility(golfFacilityId: string): Promise<{ ok: true }> {
    const res = await request(
      `${this.config.baseUrl}/golf-facilities/${golfFacilityId}/follow`,
      {
        method: 'DELETE',
        headers: await this.headers(true),
      },
    );
    return parseJson(res);
  }

  async getJoinPrefill(joinId: string): Promise<JoinPrefillDto> {
    const res = await request(`${this.config.baseUrl}/joins/${joinId}/prefill`, {
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async ensureJoinShareLink(joinId: string): Promise<{ shareSlug: string | null }> {
    const res = await request(`${this.config.baseUrl}/joins/${joinId}/share-link`, {
      method: 'POST',
      headers: await this.headers(true),
    });
    return parseJson(res);
  }

  async resolveJoinShareSlug(shareSlug: string): Promise<{ joinId: string; shareSlug: string }> {
    const res = await request(
      `${this.config.baseUrl}/joins/by-share/${encodeURIComponent(shareSlug)}`,
      { headers: await this.headers(true) },
    );
    return parseJson(res);
  }

  async getFacilityWeeklyJoins(
    golfFacilityId: string,
    date?: string,
  ): Promise<FacilityWeeklyJoinsResponse> {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    const qs = params.toString();
    const res = await request(
      `${this.config.baseUrl}/golf-facilities/${golfFacilityId}/weekly-joins${qs ? `?${qs}` : ''}`,
      { headers: await this.headers(true) },
    );
    return parseJson(res);
  }

  /** Public share payload — no auth token. */
  async getPublicJoin(shareSlug: string): Promise<PublicJoinShareDto> {
    const res = await request(`${this.config.baseUrl}/public/joins/${shareSlug}`, {
      headers: await this.headers(false),
    });
    return parseJson(res);
  }
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

export { MockAuthScenario, SocialProvider };
export type { AuthSessionDto, MeDto, SocialSignInResponse };
