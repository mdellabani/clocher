"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { updateCommuneInfoAction } from "@/app/admin/dashboard/commune-actions";
import { queryKeys } from "@pretou/shared";

const DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"] as const;

interface CommuneInfoFormProps {
  communeId: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  openingHours: Record<string, string>;
}

export function CommuneInfoForm({ communeId, address, phone, email, openingHours }: CommuneInfoFormProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    address: address ?? "",
    phone: phone ?? "",
    email: email ?? "",
    hours: { ...Object.fromEntries(DAYS.map((d) => [d, ""])), ...openingHours },
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus("idle");
    const hours = Object.fromEntries(
      Object.entries(form.hours).filter(([, v]) => v.trim())
    );
    const result = await updateCommuneInfoAction({
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
      opening_hours: hours,
    });
    setSaving(false);
    setStatus(result.error ? "error" : "success");
    if (!result.error) {
      qc.invalidateQueries({ queryKey: queryKeys.commune(communeId) });
    }
  }

  return (
    <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--theme-primary)" }}>
        Informations de la commune
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Adresse</label>
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="1 Place de la Mairie, 12345 Commune"
              className="w-full rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Téléphone</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="05 63 00 00 00"
              className="w-full rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-[var(--foreground)]">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="mairie@commune.fr"
              className="w-full rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--foreground)]">Horaires d'ouverture</label>
          <div className="space-y-2">
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-3">
                <span className="w-24 text-sm capitalize text-[var(--muted-foreground)]">{day}</span>
                <input type="text"
                  value={form.hours[day] ?? ""}
                  onChange={(e) => setForm({ ...form, hours: { ...form.hours, [day]: e.target.value } })}
                  placeholder="Fermé"
                  className="flex-1 rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm" />
              </div>
            ))}
          </div>
        </div>
        {status === "success" && <p className="text-sm text-green-600">Informations mises à jour.</p>}
        {status === "error" && <p className="text-sm text-red-600">Erreur lors de la sauvegarde.</p>}
        <button type="submit" disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--theme-primary)" }}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
