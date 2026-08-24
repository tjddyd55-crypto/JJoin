import { createContext, useContext, type ReactNode } from 'react';
import { clubMinimalTheme, type ClubMinimalTheme } from './clubMinimalTheme';

const ThemeContext = createContext<ClubMinimalTheme>(clubMinimalTheme);

type Props = {
  children: ReactNode;
  theme?: ClubMinimalTheme;
};

export function ThemeProvider({ children, theme = clubMinimalTheme }: Props) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ClubMinimalTheme {
  return useContext(ThemeContext);
}
