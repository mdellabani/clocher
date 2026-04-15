"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

interface HeroContent {
  title?: string;
  subtitle?: string;
  images?: string[];
}

interface HeroEditorProps {
  content: HeroContent;
  onSave: (content: HeroContent) => Promise<void>;
  onUploadImage: (file: File) => Promise<string | null>;
}

export function HeroEditor({ content, onSave, onUploadImage }: HeroEditorProps) {
  const [title, setTitle] = useState(content.title ?? "");
  const [subtitle, setSubtitle] = useState(content.subtitle ?? "");
  const [images, setImages] = useState<string[]>(content.images ?? []);
  const [saving, setSaving] = useState(false);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = await onUploadImage(file);
    if (path && images.length < 5) {
      setImages([...images, path]);
    }
  }

  async function handleSave() {
    setSaving(true);
    await onSave({ title, subtitle, images });
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre (ex: Saint-Martin-de-Villereglan)"
        className="w-full rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-2 text-sm" />
      <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Sous-titre (ex: Bienvenue dans notre commune)"
        className="w-full rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-2 text-sm" />
      <div>
        <label className="text-xs font-medium text-[var(--muted-foreground)]">
          Images ({images.length}/5) — plusieurs images = carrousel automatique
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative h-20 w-28 overflow-hidden rounded-lg border border-[#e8dfd0]">
              <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/website-images/${img}`}
                alt="" className="h-full w-full object-cover" />
              <button onClick={() => setImages(images.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white"><Trash2 size={10} /></button>
            </div>
          ))}
          {images.length < 5 && (
            <label className="flex h-20 w-28 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-[#e8dfd0] text-xs text-[var(--muted-foreground)] hover:border-[var(--theme-primary)]">
              + Photo
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          )}
        </div>
      </div>
      <button onClick={handleSave} disabled={saving}
        className="rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: "var(--theme-primary)" }}>
        {saving ? "..." : "Enregistrer"}
      </button>
    </div>
  );
}
