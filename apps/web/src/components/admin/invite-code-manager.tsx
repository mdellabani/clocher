"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, RefreshCw } from "lucide-react";
import { queryKeys } from "@pretou/shared";
import { regenerateInviteCodeAction } from "@/app/admin/dashboard/invite-actions";

interface InviteCodeManagerProps {
  currentCode: string;
  communeId: string;
}

export function InviteCodeManager({ currentCode, communeId }: InviteCodeManagerProps) {
  const [code, setCode] = useState(currentCode);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const qc = useQueryClient();

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerate() {
    if (!confirm("Régénérer le code ? L'ancien code ne fonctionnera plus.")) return;
    setRegenerating(true);
    const result = await regenerateInviteCodeAction();
    setRegenerating(false);
    if (result.newCode) {
      setCode(result.newCode);
      qc.invalidateQueries({ queryKey: queryKeys.commune(communeId) });
    }
  }

  return (
    <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
      <h2
        className="mb-3 text-sm font-semibold uppercase tracking-wide"
        style={{ color: "var(--theme-primary)" }}
      >
        Code d'invitation
      </h2>
      <p className="mb-4 text-xs text-[var(--muted-foreground)]">
        Partagez ce code avec les habitants pour qu'ils puissent s'inscrire
        sans validation manuelle.
      </p>
      <div className="flex items-center gap-3">
        <code className="flex-1 rounded-lg bg-[#fafaf9] border border-[#e8dfd0] px-4 py-3 text-lg font-mono font-semibold tracking-widest text-[var(--foreground)]">
          {code}
        </code>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8dfd0] bg-white px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[#fafaf9]"
        >
          <Copy size={14} />
          {copied ? "Copié !" : "Copier"}
        </button>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "var(--theme-primary)" }}
        >
          <RefreshCw size={14} className={regenerating ? "animate-spin" : ""} />
          Régénérer
        </button>
      </div>
    </div>
  );
}
