import { HeroEditor } from "./hero-editor";
import { WelcomeEditor } from "./welcome-editor";
import { HighlightsEditor } from "./highlights-editor";
import { GalleryEditor } from "./gallery-editor";
import { LinksEditor } from "./links-editor";
import { TextEditor } from "./text-editor";

interface SectionEditorProps {
  sectionType: string;
  content: Record<string, unknown>;
  onSave: (content: Record<string, unknown>) => Promise<void>;
  onUploadImage: (file: File) => Promise<string | null>;
}

export function SectionEditor({ sectionType, content, onSave, onUploadImage }: SectionEditorProps) {
  switch (sectionType) {
    case "hero":
      return <HeroEditor content={content as any} onSave={onSave as any} onUploadImage={onUploadImage} />;
    case "welcome":
      return <WelcomeEditor content={content as any} onSave={onSave as any} onUploadImage={onUploadImage} />;
    case "highlights":
      return <HighlightsEditor content={content as any} onSave={onSave as any} onUploadImage={onUploadImage} />;
    case "gallery":
      return <GalleryEditor content={content as any} onSave={onSave as any} onUploadImage={onUploadImage} />;
    case "links":
      return <LinksEditor content={content as any} onSave={onSave as any} />;
    case "text":
      return <TextEditor content={content as any} onSave={onSave as any} onUploadImage={onUploadImage} />;
    case "news":
    case "events":
    case "services":
      return <p className="text-xs text-[var(--muted-foreground)] italic">Section auto-générée — aucune modification nécessaire.</p>;
    default:
      return null;
  }
}
