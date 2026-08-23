import { usePushRegistration } from './use-push-registration';

/** Mounted lazily from root layout — must not block app shell render. */
export function PushRegistrationHost() {
  usePushRegistration();
  return null;
}
