"use client";

import { resolveTheme } from "@pretou/shared";

// Mounts an extra <style> block that overrides the page-level ThemeInjector's
// CSS variables. Cascade rule: this component renders after ThemeInjector in
// DOM order, so its :root vars win across the whole admin layout.
//
// Render this inside the customizer card while the picker state differs from
// the persisted values. Unmounting it (on save success or navigate-away)
// reasserts the persisted theme automatically.
export function ThemePreviewOverride({
  theme,
  customPrimaryColor,
}: {
  theme: string;
  customPrimaryColor: string | null;
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
