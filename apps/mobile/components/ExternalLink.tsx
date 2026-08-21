import { Link, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & {
  /** External https URL or in-app path accepted by Expo Router. */
  href: Href;
};

export function ExternalLink(props: Props) {
  return (
    <Link
      target="_blank"
      {...props}
      href={props.href}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          e.preventDefault();
          const url = typeof props.href === 'string' ? props.href : String(props.href);
          void WebBrowser.openBrowserAsync(url);
        }
      }}
    />
  );
}
