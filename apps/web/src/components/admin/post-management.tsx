"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { PostTypeBadge } from "@/components/post-type-badge";
import { togglePinAction, deletePostAction } from "@/app/admin/dashboard/actions";
import { POST_TYPE_LABELS } from "@rural-community-platform/shared";
import type { PostType } from "@rural-community-platform/shared";
import { Pin, Trash2, ChevronLeft, ChevronRight, Filter } from "lucide-react";

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
  typeFilter: string | null;
}

const PER_PAGE_OPTIONS = [10, 25, 50];
const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Tous les types" },
  { value: "annonce", label: POST_TYPE_LABELS.annonce },
  { value: "evenement", label: POST_TYPE_LABELS.evenement },
  { value: "entraide", label: POST_TYPE_LABELS.entraide },
  { value: "discussion", label: POST_TYPE_LABELS.discussion },
];

export function PostManagement({ posts, totalCount, page, perPage, typeFilter }: PostManagementProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function buildUrl(params: Record<string, string | number | null>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === "" || value === 1) {
        sp.delete(key);
      } else {
        sp.set(key, String(value));
      }
    }
    // Reset page when changing filters
    if ("type" in params || "perPage" in params) {
      sp.delete("page");
    }
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  async function handleTogglePin(postId: string, isPinned: boolean) {
    await togglePinAction(postId, isPinned);
    router.refresh();
  }

  async function handleDelete(postId: string) {
    if (!confirm("Supprimer cette publication ? Cette action est irréversible.")) return;
    await deletePostAction(postId);
    router.refresh();
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const showing = posts.length;
  const from = (page - 1) * perPage + 1;
  const to = from + showing - 1;

  return (
    <div className="rounded-[14px] bg-white px-5 py-4 shadow-[0_1px_6px_rgba(160,130,90,0.06)]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Publications ({totalCount})
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          {/* Type filter */}
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-[var(--theme-muted)]" />
            <select
              value={typeFilter ?? ""}
              onChange={(e) => router.push(buildUrl({ type: e.target.value }))}
              className="rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Per page */}
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
      </div>

      {posts.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
          Aucune publication{typeFilter ? ` de type "${POST_TYPE_LABELS[typeFilter as PostType]}"` : ""}.
        </p>
      ) : (
        <>
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
                      {new Date(post.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
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
