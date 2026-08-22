import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { SocialLoginCancelledError, SocialLoginUnavailableError } from '../social-auth-errors';
import { googleWebClientId } from '../social-auth-config';

let configured = false;

function ensureGoogleConfigured() {
  if (configured) return;
  const webClientId = googleWebClientId();
  if (!webClientId) {
    throw new SocialLoginUnavailableError('GOOGLE', 'missing_web_client_id');
  }
  GoogleSignin.configure({
    webClientId,
    offlineAccess: false,
  });
  configured = true;
}

export async function obtainGoogleIdToken(): Promise<string> {
  ensureGoogleConfigured();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = await GoogleSignin.signIn();
    const idToken = result.data?.idToken;
    if (!idToken) {
      throw new SocialLoginUnavailableError('GOOGLE', 'empty_id_token');
    }
    return idToken;
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new SocialLoginCancelledError('GOOGLE');
    }
    if (err.code === statusCodes.IN_PROGRESS) {
      throw new SocialLoginUnavailableError('GOOGLE', 'in_progress');
    }
    throw e;
  }
}
