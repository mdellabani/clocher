import { getTheme } from "@rural-community-platform/shared";

export function ThemeInjector({ theme }: { theme?: string | null }) {
  const t = getTheme(theme);
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      :root {
        --theme-primary: ${t.primary};
        --theme-gradient-1: ${t.gradient[0]};
        --theme-gradient-2: ${t.gradient[1]};
        --theme-gradient-3: ${t.gradient[2]};
        --theme-background: ${t.background};
        --theme-muted: ${t.muted};
        --theme-pin-bg: ${t.pinBg};
        --primary: ${t.primary};
        --ring: ${t.primary};
      }
    `}} />
  );
}
