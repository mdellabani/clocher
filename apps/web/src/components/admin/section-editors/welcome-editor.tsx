"use client";

import { useState } from "react";

interface WelcomeContent {
  title?: string;
  body?: string;
  image?: string;
}

interface WelcomeEditorProps {
  content: WelcomeContent;
  onSave: (content: WelcomeContent) => Promise<void>;
  onUploadImage: (file: File) => Promise<string | null>;
}

export function WelcomeEditor({ content, onSave, onUploadImage }: WelcomeEditorProps) {
  const [title, setTitle] = useState(content.title ?? "");
  const [body, setBody] = useState(content.body ?? "");
  const [image, setImage] = useState(content.image ?? "");
  const [saving, setSaving] = useState(false);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = await onUploadImage(file);
    if (path) setImage(path);
  }

  async function handleSave() {
    setSaving(true);
    await onSave({ title, body, image: image || undefined });
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre (ex: Mot du maire)"
        className="w-full rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-2 text-sm" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Texte de bienvenue..."
        rows={4} className="w-full rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-2 text-sm" />
      <div className="flex items-center gap-3">
        {image && (
          <div className="relative h-16 w-16 overflow-hidden rounded-lg border">
            <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/website-images/${image}`}
              alt="" className="h-full w-full object-cover" />
            <button onClick={() => setImage("")}
              className="absolute right-0 top-0 rounded-full bg-red-500 p-0.5 text-white text-xs">✕</button>
          </div>
        )}
        <label className="cursor-pointer text-xs font-medium underline" style={{ color: "var(--theme-primary)" }}>
          {image ? "Changer la photo" : "Ajouter une photo (optionnel)"}
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </label>
      </div>
      <button onClick={handleSave} disabled={saving}
        className="rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: "var(--theme-primary)" }}>
        {saving ? "..." : "Enregistrer"}
      </button>
    </div>
  );
}
