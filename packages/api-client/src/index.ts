import {
  MockAuthScenario,
  SocialProvider,
  type AuthSessionDto,
  type CreateJoinRequest,
  type ExploreFilter,
  type ExploreMapResponse,
  type JoinCoinPreviewDto,
  type JoinCoinPreviewRequest,
  type JoinDetailDto,
  type MeDto,
  type MyJoinsResponse,
  type PrivateIdentityDto,
  type PrivatePresenceDto,
  type PublicUserProfileDto,
  type SocialSignInRequest,
  type SocialSignInResponse,
  type SportSkillLevel,
  type UpsertPresenceRequest,
  type WalletSummaryDto,
  type WalletTransactionsResponse,
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

  async getIdentityStatus(): Promise<PrivateIdentityDto> {
    const res = await request(`${this.config.baseUrl}/me/identity-status`, {
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
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

export { MockAuthScenario, SocialProvider };
export type { AuthSessionDto, MeDto, SocialSignInResponse };
