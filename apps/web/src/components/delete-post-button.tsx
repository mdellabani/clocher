"use client";

import { Trash2 } from "lucide-react";
import { deletePostAction } from "@/app/app/posts/[id]/actions";

export function DeletePostButton({ postId }: { postId: string }) {
  async function handleDelete() {
    if (!confirm("Supprimer cette publication ? Cette action est irréversible.")) return;
    await deletePostAction(postId);
  }

  return (
    <button
      onClick={handleDelete}
      className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
    >
      <Trash2 size={14} />
      Supprimer
    </button>
  );
}
