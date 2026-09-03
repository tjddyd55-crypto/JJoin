import { createContext, useContext, type ReactNode } from 'react';
import {
  brightSocialSportsTheme,
  type BrightSocialSportsTheme,
} from './clubMinimalTheme';

const ThemeContext = createContext<BrightSocialSportsTheme>(brightSocialSportsTheme);

type Props = {
  children: ReactNode;
  theme?: BrightSocialSportsTheme;
};

export function ThemeProvider({ children, theme = brightSocialSportsTheme }: Props) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): BrightSocialSportsTheme {
  return useContext(ThemeContext);
}
