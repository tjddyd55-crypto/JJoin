import { Linking } from 'react-native';
import { isSafeExternalUrl } from './store-external-url-safety';

export { isSafeExternalUrl } from './store-external-url-safety';

export async function openStoreExternalUrl(url: string): Promise<boolean> {
  if (!isSafeExternalUrl(url)) return false;
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) return false;
  await Linking.openURL(url);
  return true;
}

export async function openStorePhoneDialer(phone: string): Promise<void> {
  const digits = phone.replace(/[^\d+]/g, '');
  if (!digits) return;
  await Linking.openURL(`tel:${digits}`);
}
