/**
 * Obtain provider credential for POST /auth/social/exchange.
 * Real native SDK integration is added per provider when console credentials exist.
 * Mock credentials work when API SOCIAL_AUTH_MODE=mock|hybrid.
 */
import { SocialProvider } from '@jjoin/types';

export async function obtainSocialCredential(provider: SocialProvider): Promise<string> {
  const subject = `mobile-${Date.now()}`;
  return `mock:${provider}:${subject}`;
}
