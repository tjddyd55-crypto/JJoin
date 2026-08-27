import { Redirect } from 'expo-router';

/** Legacy Expo template route — never expose EditScreenInfo in production builds. */
export default function ModalScreen() {
  return <Redirect href="/" />;
}
