import { resolveTheme } from "@pretou/shared";

export function ThemeInjector({
  theme,
  customPrimaryColor,
}: {
  theme?: string | null;
  customPrimaryColor?: string | null;
}) {
  const t = resolveTheme(theme, customPrimaryColor);
  const css = `
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
  `;
  return <style key={css} dangerouslySetInnerHTML={{ __html: css }} />;
}
