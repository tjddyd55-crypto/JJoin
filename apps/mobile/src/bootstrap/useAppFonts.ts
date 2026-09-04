import { useFonts } from 'expo-font';
import { IBMPlexSansKR_400Regular } from '@expo-google-fonts/ibm-plex-sans-kr/400Regular';
import { IBMPlexSansKR_500Medium } from '@expo-google-fonts/ibm-plex-sans-kr/500Medium';
import { IBMPlexSansKR_600SemiBold } from '@expo-google-fonts/ibm-plex-sans-kr/600SemiBold';
import { IBMPlexSansKR_700Bold } from '@expo-google-fonts/ibm-plex-sans-kr/700Bold';

/** Maps design-system fontFamily tokens to loaded expo-google-fonts files. */
export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    'IBMPlexSansKR-Regular': IBMPlexSansKR_400Regular,
    'IBMPlexSansKR-Medium': IBMPlexSansKR_500Medium,
    'IBMPlexSansKR-SemiBold': IBMPlexSansKR_600SemiBold,
    'IBMPlexSansKR-Bold': IBMPlexSansKR_700Bold,
  });
  return loaded;
}
