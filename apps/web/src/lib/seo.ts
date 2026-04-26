import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const SITE_NAME = "Pretou";

export function buildMetadata(overrides: Partial<Metadata> = {}): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
    description: overrides.description ?? "L'app des communes rurales — annonces officielles, événements, entraide.",
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url: SITE_URL,
      ...overrides.openGraph,
    },
    ...overrides,
  };
}

export function buildJsonLd(overrides: Record<string, unknown> = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    ...overrides,
  };
}
