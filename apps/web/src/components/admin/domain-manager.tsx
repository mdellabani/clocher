"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Globe, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { queryKeys } from "@pretou/shared";
import {
  setCustomDomainAction,
  verifyDomainAction,
  removeDomainAction,
} from "@/app/admin/dashboard/domain-actions";

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "localhost:3000";

interface DomainManagerProps {
  slug: string;
  customDomain: string | null;
  domainVerified: boolean;
  communeId: string;
}

export function DomainManager({ slug, customDomain, domainVerified, communeId }: DomainManagerProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [domain, setDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  async function handleSetDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim()) return;
    setSaving(true);
    setError(null);
    const result = await setCustomDomainAction(domain.trim());
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setDomain("");
      qc.invalidateQueries({ queryKey: queryKeys.commune(communeId) });
    }
  }

  async function handleVerify() {
    setVerifying(true);
    setVerifyResult(null);
    setError(null);
    const result = await verifyDomainAction();
    setVerifying(false);
    if (result.error) {
      setError(result.error);
    } else if (result.verified) {
      setVerifyResult("success");
      qc.invalidateQueries({ queryKey: queryKeys.commune(communeId) });
    } else {
      setVerifyResult("not_found");
    }
  }

  async function handleRemove() {
    if (!confirm("Supprimer le domaine personnalisé ?")) return;
    setRemoving(true);
    await removeDomainAction();
    setRemoving(false);
    qc.invalidateQueries({ queryKey: queryKeys.commune(communeId) });
  }

  return (
    <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--theme-primary)" }}>
        Nom de domaine
      </h2>

      {/* Current subdomain */}
      <p className="mb-4 text-sm text-[var(--muted-foreground)]">
        Votre site communal est accessible à{" "}
        <a href={`https://${slug}.${PLATFORM_DOMAIN}`} target="_blank" rel="noopener noreferrer"
          className="font-mono font-medium underline" style={{ color: "var(--theme-primary)" }}>
          {slug}.{PLATFORM_DOMAIN}
        </a>
      </p>

      {/* State: no custom domain */}
      {!customDomain && (
        <form onSubmit={handleSetDomain} className="space-y-3">
          <label className="text-sm font-medium text-[var(--foreground)]">
            Ajouter un domaine personnalisé
          </label>
          <div className="flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3">
              <Globe size={14} className="text-[var(--muted-foreground)]" />
              <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)}
                placeholder="www.saint-martin.fr"
                className="flex-1 bg-transparent py-2 text-sm outline-none" />
            </div>
            <button type="submit" disabled={saving || !domain.trim()}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--theme-primary)" }}>
              {saving ? "..." : "Ajouter"}
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}

      {/* State: domain set, not verified */}
      {customDomain && !domainVerified && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-500" />
            <span className="text-sm font-medium text-amber-700">{customDomain}</span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
              En attente de vérification
            </span>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="mb-2 font-medium text-amber-800">Configuration DNS requise</p>
            <p className="mb-3 text-amber-700">
              Connectez-vous à votre fournisseur de domaine (OVH, Gandi, Ionos...) et ajoutez un enregistrement CNAME :
            </p>
            <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-amber-100">
                    <th className="px-3 py-2 text-left font-semibold text-amber-800">Type</th>
                    <th className="px-3 py-2 text-left font-semibold text-amber-800">Hôte</th>
                    <th className="px-3 py-2 text-left font-semibold text-amber-800">Valeur</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 font-mono text-amber-700">CNAME</td>
                    <td className="px-3 py-2 font-mono text-amber-700">
                      {customDomain.startsWith("www.") ? "www" : "@"}
                    </td>
                    <td className="px-3 py-2 font-mono text-amber-700">communes.{PLATFORM_DOMAIN}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-amber-600">
              La propagation DNS peut prendre jusqu'à 24 heures.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleVerify} disabled={verifying}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--theme-primary)" }}>
              {verifying ? "Vérification..." : "Vérifier la configuration DNS"}
            </button>
            <button onClick={handleRemove} disabled={removing}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">
              <Trash2 size={13} /> Supprimer
            </button>
          </div>

          {verifyResult === "not_found" && (
            <p className="text-sm text-amber-600">
              DNS non détecté. Vérifiez votre configuration et réessayez dans quelques minutes.
            </p>
          )}
          {verifyResult === "success" && (
            <p className="text-sm text-green-600">Domaine vérifié avec succès !</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {/* State: domain verified */}
      {customDomain && domainVerified && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-500" />
            <a href={`https://${customDomain}`} target="_blank" rel="noopener noreferrer"
              className="text-sm font-medium underline" style={{ color: "var(--theme-primary)" }}>
              {customDomain}
            </a>
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600">
              Domaine actif
            </span>
          </div>
          <button onClick={handleRemove} disabled={removing}
            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">
            <Trash2 size={13} /> {removing ? "..." : "Supprimer le domaine"}
          </button>
        </div>
      )}
    </div>
  );
}
