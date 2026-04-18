"use client";

import { HomepageEditor } from "./homepage-editor";
import { useHomepageSections } from "@/hooks/queries/use-homepage-sections";
import { useProfile } from "@/hooks/use-profile";

export function HomepageClient() {
  const { profile } = useProfile();
  const communeId = profile?.commune_id ?? "";
  const { data: sections = [] } = useHomepageSections(communeId);

  if (!communeId) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Éditeur de page d'accueil</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Personnalisez les sections de votre site communal</p>
        </div>
        <a href="/admin/dashboard" className="text-sm underline" style={{ color: "var(--theme-primary)" }}>
          ← Retour au tableau de bord
        </a>
      </div>
      <HomepageEditor initialSections={sections as any[]} communeId={communeId} />
    </div>
  );
}
