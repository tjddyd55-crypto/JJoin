/** Provider ports — adapters implement these later. */

export interface SocialAuthProvider {
  readonly name: 'KAKAO' | 'NAVER' | 'GOOGLE';
  exchangeCode(code: string): Promise<{ subject: string; email?: string }>;
}

export interface IdentityVerificationProvider {
  start(userId: string): Promise<{ sessionId: string }>;
  confirm(sessionId: string): Promise<{ verified: boolean; ciHash?: string }>;
}

/** @deprecated Use VenueSearchProvider from venue-search.types — kept for compile compatibility during Phase H. */
export type { VenueSearchProvider } from './venue-search.types';

export interface MediaStorageProvider {
  createUploadUrl(input: {
    userId: string;
    contentType: string;
  }): Promise<{ uploadUrl: string; assetKey: string }>;
}
