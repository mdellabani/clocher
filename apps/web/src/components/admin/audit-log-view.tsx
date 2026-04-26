"use client";

import type { AuditLog } from "@rural-community-platform/shared";

interface AuditLogViewProps {
  entries: AuditLog[];
}

const ACTION_LABELS: Record<string, string> = {
  post_hidden: "a masqué un post",
  post_deleted: "a supprimé un post",
  post_restored: "a restauré un post",
  report_dismissed: "a rejeté un signalement",
  report_actioned: "a traité un signalement",
  producer_approved: "a approuvé un producteur",
  producer_rejected: "a rejeté un producteur",
  user_approved: "a approuvé un utilisateur",
  role_changed: "a modifié un rôle",
};

export function AuditLogView({ entries }: AuditLogViewProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-[14px] bg-white px-5 py-4 shadow-[0_1px_6px_rgba(160,130,90,0.06)]">
        <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">
          Journal d'audit
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Aucune action enregistrée.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[14px] bg-white px-5 py-4 shadow-[0_1px_6px_rgba(160,130,90,0.06)]">
      <h2 className="mb-4 text-base font-semibold text-[var(--foreground)]">
        Journal d'audit
      </h2>

      <div className="space-y-3">
        {entries.map((entry) => {
          const actorName =
            entry.profiles?.display_name || entry.actor_id || "Système";
          const actionLabel =
            ACTION_LABELS[entry.action] || entry.action;
          const timestamp = new Date(entry.created_at);
          const dateStr = timestamp.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
          });
          const timeStr = timestamp.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={entry.id}
              className="rounded-lg border border-[var(--border)] px-4 py-3 text-sm"
            >
              <p className="font-medium text-[var(--foreground)]">
                <span>{actorName}</span>
                <span className="text-[var(--muted-foreground)]">
                  {" "}
                  {actionLabel}
                </span>
                <span className="text-[var(--muted-foreground)]">
                  {" "}
                  — {dateStr} à {timeStr}
                </span>
              </p>
              {entry.reason && (
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Raison : {entry.reason}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
