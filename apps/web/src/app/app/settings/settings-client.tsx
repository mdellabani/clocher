"use client";

import { useProfile } from "@/hooks/queries/use-profile";
import { useCommune } from "@/hooks/queries/use-commune";
import { SettingsForm } from "./settings-form";

export function SettingsClient({ userId, userEmail }: { userId: string; userEmail: string }) {
  const { data: profile } = useProfile(userId);
  const { data: commune } = useCommune(profile?.commune_id ?? "");

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Paramètres du compte
      </h1>

      <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
        <h2
          className="mb-4 text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--theme-primary)" }}
        >
          Informations du compte
        </h2>
        <dl className="space-y-3">
          <div className="flex items-center gap-3">
            <dt className="w-32 text-sm text-[var(--muted-foreground)]">E-mail</dt>
            <dd className="text-sm font-medium text-[var(--foreground)]">{userEmail}</dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="w-32 text-sm text-[var(--muted-foreground)]">Commune</dt>
            <dd className="text-sm font-medium text-[var(--foreground)]">{commune?.name ?? "—"}</dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="w-32 text-sm text-[var(--muted-foreground)]">Rôle</dt>
            <dd className="text-sm font-medium text-[var(--foreground)]">
              {profile.role === "admin" ? "Administrateur" : "Résident"}
            </dd>
          </div>
        </dl>
      </div>

      <SettingsForm
        userId={profile.id}
        initialDisplayName={profile.display_name ?? ""}
        initialAvatarUrl={profile.avatar_url}
      />
    </div>
  );
}
