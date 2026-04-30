"use client";

import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { approveUserAction, rejectUserAction } from "@/app/admin/dashboard/actions";
import { Check, X } from "lucide-react";

interface PendingUser {
  id: string;
  display_name: string;
  created_at: string;
}

interface PendingUsersProps {
  users: PendingUser[];
  communeId: string;
}

export function PendingUsers({ users, communeId }: PendingUsersProps) {
  const qc = useQueryClient();

  async function handleApprove(userId: string) {
    await approveUserAction(userId);
    await qc.invalidateQueries({ queryKey: queryKeys.admin.pendingUsers(communeId) });
  }

  async function handleReject(userId: string) {
    await rejectUserAction(userId);
    await qc.invalidateQueries({ queryKey: queryKeys.admin.pendingUsers(communeId) });
  }

  return (
    <div className="rounded-[14px] bg-white px-5 py-4 shadow-[0_1px_6px_rgba(160,130,90,0.06)]">
      <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">
        Inscriptions en attente ({users.length})
      </h2>
      {users.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          Aucune inscription en attente.
        </p>
      ) : (
        <ul className="space-y-2">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] px-4 py-3"
            >
              <div>
                <p className="font-medium text-[var(--foreground)]">{user.display_name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {new Date(user.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(user.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600 transition-colors hover:bg-green-100"
                  aria-label="Approuver"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => handleReject(user.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-colors hover:bg-red-100"
                  aria-label="Refuser"
                >
                  <X size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
