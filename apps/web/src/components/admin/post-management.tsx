"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { PostTypeBadge } from "@/components/post-type-badge";
import { togglePinAction, deletePostAction } from "@/app/admin/dashboard/actions";
import type { PostType } from "@pretou/shared";
import { queryKeys } from "@pretou/shared";
import { Pin, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

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
  totalCount: number;
  page: number;
  perPage: number;
}

const PER_PAGE_OPTIONS = [10, 25, 50];

export function PostManagement({ posts, totalCount, page, perPage }: PostManagementProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  function buildUrl(params: Record<string, string | number | null>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === "") {
        sp.delete(key);
      } else {
        sp.set(key, String(value));
      }
    }
    if ("perPage" in params) sp.delete("page");
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  async function handleTogglePin(postId: string, isPinned: boolean) {
    const result = await togglePinAction(postId, isPinned);
    if (!result.error) {
      qc.invalidateQueries({ queryKey: ["posts"] });
    }
  }

  async function handleDelete(postId: string) {
    if (!confirm("Supprimer cette publication ? Cette action est irréversible.")) return;
    const result = await deletePostAction(postId);
    if (!result.error) {
      qc.invalidateQueries({ queryKey: ["posts"] });
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const showing = posts.length;
  const from = (page - 1) * perPage + 1;
  const to = from + showing - 1;

  return (
    <div className="rounded-[14px] bg-white px-5 py-4 shadow-[0_1px_6px_rgba(160,130,90,0.06)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Publications ({totalCount})
        </h2>

        <select
          value={perPage}
          onChange={(e) => router.push(buildUrl({ perPage: Number(e.target.value) }))}
          className="rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
        >
          {PER_PAGE_OPTIONS.map((n) => (
            <option key={n} value={n}>{n} par page</option>
          ))}
        </select>
      </div>

      {posts.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
          Aucune publication pour cette sélection.
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {posts.map((post) => (
              <li
                key={post.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[var(--foreground)]">{post.title}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {post.profiles?.display_name ?? "Inconnu"} &middot;{" "}
                    {new Date(post.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <PostTypeBadge type={post.type} />
                  <button
                    onClick={() => handleTogglePin(post.id, post.is_pinned)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                      post.is_pinned
                        ? "bg-[var(--theme-pin-bg)] text-[var(--theme-primary)]"
                        : "bg-gray-50 text-[var(--muted-foreground)] hover:bg-gray-100"
                    }`}
                    title={post.is_pinned ? "Désépingler" : "Épingler"}
                  >
                    <Pin size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-colors hover:bg-red-100"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
            <p className="text-xs text-[var(--muted-foreground)]">
              {from}–{to} sur {totalCount}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => router.push(buildUrl({ page: page - 1 }))}
                disabled={page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--foreground)] transition-colors hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 text-xs font-medium text-[var(--foreground)]">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => router.push(buildUrl({ page: page + 1 }))}
                disabled={page >= totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--foreground)] transition-colors hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
