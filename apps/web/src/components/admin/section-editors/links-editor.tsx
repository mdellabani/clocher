"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";

interface LinkItem { emoji: string; label: string; url: string; }
interface LinksContent { items?: LinkItem[]; }

interface LinksEditorProps {
  content: LinksContent;
  onSave: (content: LinksContent) => Promise<void>;
}

export function LinksEditor({ content, onSave }: LinksEditorProps) {
  const [items, setItems] = useState<LinkItem[]>(content.items ?? []);
  const [saving, setSaving] = useState(false);

  function updateItem(index: number, field: keyof LinkItem, value: string) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  }

  async function handleSave() {
    setSaving(true);
    await onSave({ items: items.filter((item) => item.label.trim()) });
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="text" value={item.emoji} onChange={(e) => updateItem(i, "emoji", e.target.value)}
            placeholder="📋" className="w-12 rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-2 py-1.5 text-center text-sm" />
          <input type="text" value={item.label} onChange={(e) => updateItem(i, "label", e.target.value)}
            placeholder="Label" className="flex-1 rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm" />
          <input type="text" value={item.url} onChange={(e) => updateItem(i, "url", e.target.value)}
            placeholder="https://..." className="flex-1 rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm" />
          <button onClick={() => setItems(items.filter((_, j) => j !== i))}
            className="rounded p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
        </div>
      ))}
      {items.length < 6 && (
        <button onClick={() => setItems([...items, { emoji: "🔗", label: "", url: "" }])}
          className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--theme-primary)" }}>
          <Plus size={14} /> Ajouter un lien
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
