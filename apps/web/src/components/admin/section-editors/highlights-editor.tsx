"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";

interface HighlightItem { title: string; description: string; link?: string; image?: string; }
interface HighlightsContent { items?: HighlightItem[]; }

interface HighlightsEditorProps {
  content: HighlightsContent;
  onSave: (content: HighlightsContent) => Promise<void>;
  onUploadImage: (file: File) => Promise<string | null>;
}

export function HighlightsEditor({ content, onSave, onUploadImage }: HighlightsEditorProps) {
  const [items, setItems] = useState<HighlightItem[]>(content.items ?? []);
  const [saving, setSaving] = useState(false);

  function updateItem(index: number, field: keyof HighlightItem, value: string) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  }

  async function handleImageUpload(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = await onUploadImage(file);
    if (path) updateItem(index, "image", path);
  }

  async function handleSave() {
    setSaving(true);
    await onSave({ items: items.filter((item) => item.title.trim()) });
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-[#e8dfd0] p-3 space-y-2">
          <div className="flex gap-2">
            <input type="text" value={item.title} onChange={(e) => updateItem(i, "title", e.target.value)}
              placeholder="Titre" className="flex-1 rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm" />
            <button onClick={() => setItems(items.filter((_, j) => j !== i))}
              className="rounded p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
          </div>
          <input type="text" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)}
            placeholder="Description" className="w-full rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm" />
          <div className="flex gap-2">
            <input type="text" value={item.link ?? ""} onChange={(e) => updateItem(i, "link", e.target.value)}
              placeholder="Lien (optionnel)" className="flex-1 rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm" />
            <label className="cursor-pointer rounded-lg border border-[#e8dfd0] px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:bg-[#fafaf9]">
              📷 {item.image ? "✓" : "+"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(i, e)} />
            </label>
          </div>
        </div>
      ))}
      {items.length < 4 && (
        <button onClick={() => setItems([...items, { title: "", description: "" }])}
          className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--theme-primary)" }}>
          <Plus size={14} /> Ajouter un élément
        </button>
      )}
      <div>
        <button onClick={handleSave} disabled={saving}
          className="rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--theme-primary)" }}>
          {saving ? "..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
