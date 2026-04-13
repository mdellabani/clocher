"use client";

import { useRouter } from "next/navigation";
import { PostTypeBadge } from "@/components/post-type-badge";
import { togglePinAction, deletePostAction } from "@/app/admin/dashboard/actions";
import type { PostType } from "@rural-community-platform/shared";
import { Pin, Trash2 } from "lucide-react";

interface PostItem {
  id: string;
  title: string;
  type: PostType;
  is_pinned: boolean;
  created_at: string;
  profiles: { display_name: string } | null;
}

interface PostManagementProps {
  posts: PostItem[];
}

export function PostManagement({ posts }: PostManagementProps) {
  const router = useRouter();

  async function handleTogglePin(postId: string, isPinned: boolean) {
    await togglePinAction(postId, isPinned);
    router.refresh();
  }

  async function handleDelete(postId: string) {
    if (!confirm("Supprimer cette publication ? Cette action est irreversible.")) return;
    await deletePostAction(postId);
    router.refresh();
  }

  return (
    <div className="rounded-[14px] bg-white px-5 py-4 shadow-[0_1px_6px_rgba(160,130,90,0.06)]">
      <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">
        Publications ({posts.length})
      </h2>
      {posts.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          Aucune publication.
        </p>
      ) : (
        <ul className="space-y-2">
          {posts.map((post) => (
            <li
              key={post.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] px-4 py-3"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <PostTypeBadge type={post.type} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--foreground)]">{post.title}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {post.profiles?.display_name ?? "Inconnu"} &middot;{" "}
                    {new Date(post.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => handleTogglePin(post.id, post.is_pinned)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    post.is_pinned
                      ? "bg-[var(--theme-pin-bg)] text-[var(--theme-primary)]"
                      : "bg-gray-50 text-[var(--muted-foreground)] hover:bg-gray-100"
                  }`}
                  aria-label={post.is_pinned ? "Desepingler" : "Epingler"}
                >
                  <Pin size={16} />
                </button>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-colors hover:bg-red-100"
                  aria-label="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
