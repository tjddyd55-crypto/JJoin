/** Provider ports — adapters implement these. */

export type VerifiedSocialProfile = {
  subject: string;
  email?: string;
  nickname?: string;
  avatarUrl?: string;
};

export interface SocialAuthProvider {
  readonly name: 'KAKAO' | 'NAVER' | 'GOOGLE';
  verifyCredential(credential: string): Promise<VerifiedSocialProfile>;
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
