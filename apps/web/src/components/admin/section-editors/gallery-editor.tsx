"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

interface GalleryImage { url: string; caption?: string; }
interface GalleryContent { images?: GalleryImage[]; }

interface GalleryEditorProps {
  content: GalleryContent;
  onSave: (content: GalleryContent) => Promise<void>;
  onUploadImage: (file: File) => Promise<string | null>;
}

export function GalleryEditor({ content, onSave, onUploadImage }: GalleryEditorProps) {
  const [images, setImages] = useState<GalleryImage[]>(content.images ?? []);
  const [saving, setSaving] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (images.length >= 12) break;
      const path = await onUploadImage(file);
      if (path) {
        setImages((prev) => [...prev, { url: path }]);
      }
    }
  }

  async function handleSave() {
    setSaving(true);
    await onSave({ images });
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-[var(--muted-foreground)]">Photos ({images.length}/12)</label>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((img, i) => (
          <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-[#e8dfd0]">
            <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/website-images/${img.url}`}
              alt="" className="h-full w-full object-cover" />
            <button onClick={() => setImages(images.filter((_, j) => j !== i))}
              className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white"><Trash2 size={10} /></button>
            <input type="text" value={img.caption ?? ""} placeholder="Légende"
              onChange={(e) => { const u = [...images]; u[i] = { ...u[i], caption: e.target.value }; setImages(u); }}
              className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 text-xs text-white placeholder:text-white/60 outline-none" />
          </div>
        ))}
        {images.length < 12 && (
          <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-[#e8dfd0] text-sm text-[var(--muted-foreground)] hover:border-[var(--theme-primary)]">
            + Photos
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
          </label>
        )}
      </div>
      <button onClick={handleSave} disabled={saving}
        className="rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: "var(--theme-primary)" }}>
        {saving ? "..." : "Enregistrer"}
      </button>
    </div>
  );
}
