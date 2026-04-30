"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus } from "lucide-react";
import { updateAssociationsAction } from "@/app/admin/dashboard/commune-actions";
import { queryKeys } from "@pretou/shared";

interface Association {
  name: string;
  description?: string;
  contact?: string;
  schedule?: string;
}

interface AssociationsManagerProps {
  communeId: string;
  associations: Association[];
}

export function AssociationsManager({ communeId, associations: initial }: AssociationsManagerProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [associations, setAssociations] = useState<Association[]>(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  function addAssociation() {
    setAssociations([...associations, { name: "" }]);
  }

  function removeAssociation(index: number) {
    setAssociations(associations.filter((_, i) => i !== index));
  }

  function updateField(index: number, field: keyof Association, value: string) {
    const updated = [...associations];
    updated[index] = { ...updated[index], [field]: value };
    setAssociations(updated);
  }

  async function handleSave() {
    const filtered = associations.filter((a) => a.name.trim());
    setSaving(true);
    setStatus("idle");
    const result = await updateAssociationsAction(filtered);
    setSaving(false);
    setStatus(result.error ? "error" : "success");
    if (!result.error) {
      setAssociations(filtered);
      qc.invalidateQueries({ queryKey: queryKeys.commune(communeId) });
    }
  }

  return (
    <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--theme-primary)" }}>
        Associations
      </h2>
      <div className="space-y-3">
        {associations.map((assoc, idx) => (
          <div key={idx} className="rounded-lg border border-[#e8dfd0] p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input type="text" value={assoc.name} placeholder="Nom de l'association"
                onChange={(e) => updateField(idx, "name", e.target.value)}
                className="flex-1 rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm font-medium" />
              <button onClick={() => removeAssociation(idx)} className="rounded p-1.5 text-red-500 hover:bg-red-50">
                <Trash2 size={14} />
              </button>
            </div>
            <input type="text" value={assoc.description ?? ""} placeholder="Description (optionnel)"
              onChange={(e) => updateField(idx, "description", e.target.value)}
              className="w-full rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={assoc.contact ?? ""} placeholder="Contact"
                onChange={(e) => updateField(idx, "contact", e.target.value)}
                className="rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm" />
              <input type="text" value={assoc.schedule ?? ""} placeholder="Horaires"
                onChange={(e) => updateField(idx, "schedule", e.target.value)}
                className="rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm" />
            </div>
          </div>
        ))}
      </div>
      <button onClick={addAssociation}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--theme-primary)" }}>
        <Plus size={14} /> Ajouter une association
      </button>
      <div className="mt-4">
        {status === "success" && <p className="mb-2 text-sm text-green-600">Associations mises à jour.</p>}
        {status === "error" && <p className="mb-2 text-sm text-red-600">Erreur lors de la sauvegarde.</p>}
        <button onClick={handleSave} disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--theme-primary)" }}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
