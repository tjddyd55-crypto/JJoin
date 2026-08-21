/** Provider ports — adapters implement these later. */

export interface SocialAuthProvider {
  readonly name: 'KAKAO' | 'NAVER' | 'GOOGLE';
  exchangeCode(code: string): Promise<{ subject: string; email?: string }>;
}

export interface IdentityVerificationProvider {
  start(userId: string): Promise<{ sessionId: string }>;
  confirm(sessionId: string): Promise<{ verified: boolean; ciHash?: string }>;
}

export interface VenueSearchProvider {
  searchNearby(input: {
    lat: number;
    lng: number;
    sportCode: string;
    query?: string;
  }): Promise<Array<{ providerPlaceId: string; name: string; lat: number; lng: number }>>;
}

export interface MediaStorageProvider {
  createUploadUrl(input: {
    userId: string;
    contentType: string;
  }): Promise<{ uploadUrl: string; assetKey: string }>;
}
