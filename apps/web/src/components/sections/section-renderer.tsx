import { HeroSection } from "./hero-section";
import { WelcomeSection } from "./welcome-section";
import { HighlightsSection } from "./highlights-section";
import { NewsSection } from "./news-section";
import { EventsSection } from "./events-section";
import { GallerySection } from "./gallery-section";
import { LinksSection } from "./links-section";
import { TextSection } from "./text-section";
import { ServicesSection } from "./services-section";

interface PageSection {
  id: string;
  section_type: string;
  content: Record<string, unknown>;
}

export function SectionRenderer({
  section,
  communeId,
}: {
  section: PageSection;
  communeId: string;
}) {
  switch (section.section_type) {
    case "hero":
      return <HeroSection content={section.content as any} />;
    case "welcome":
      return <WelcomeSection content={section.content as any} />;
    case "highlights":
      return <HighlightsSection content={section.content as any} />;
    case "news":
      return <NewsSection communeId={communeId} />;
    case "events":
      return <EventsSection communeId={communeId} />;
    case "gallery":
      return <GallerySection content={section.content as any} />;
    case "links":
      return <LinksSection content={section.content as any} />;
    case "text":
      return <TextSection content={section.content as any} />;
    case "services":
      return <ServicesSection communeId={communeId} />;
    default:
      return null;
  }
}
