import { createContext, useContext } from "react";
import { getTheme, type ThemeConfig } from "@rural-community-platform/shared";

const ThemeContext = createContext<ThemeConfig>(getTheme(null));

export function ThemeProvider({ theme, children }: { theme: string | null; children: React.ReactNode }) {
  return <ThemeContext.Provider value={getTheme(theme)}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeConfig {
  return useContext(ThemeContext);
}
