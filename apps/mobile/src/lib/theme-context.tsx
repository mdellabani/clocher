import { createContext, useContext } from "react";
import { resolveTheme, type ThemeConfig } from "@pretou/shared";

const ThemeContext = createContext<ThemeConfig>(resolveTheme(null, null));

export function ThemeProvider({
  theme,
  customPrimaryColor,
  children,
}: {
  theme: string | null;
  customPrimaryColor?: string | null;
  children: React.ReactNode;
}) {
  return (
    <ThemeContext.Provider value={resolveTheme(theme, customPrimaryColor)}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeConfig {
  return useContext(ThemeContext);
}
