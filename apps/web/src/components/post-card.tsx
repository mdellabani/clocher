import Link from "next/link";
import { PostTypeBadge } from "@/components/post-type-badge";
import type { Post, PostType } from "@rural-community-platform/shared";
import { Pin, MessageCircle } from "lucide-react";

export function PostCard({ post }: { post: Post }) {
  const commentCount = post.comments?.[0]?.count ?? 0;
  const rsvpCount =
    post.rsvps?.filter((r) => r.status === "going").length ?? 0;

  return (
    <Link href={`/app/posts/${post.id}`} className="block">
      <div
        className="relative bg-white rounded-[14px] border border-[#f0e8da] shadow-[0_2px_8px_rgba(140,120,80,0.08)] transition-all hover:shadow-[0_4px_16px_rgba(140,120,80,0.14)] hover:-translate-y-0.5"
        style={post.is_pinned ? {
          borderTopColor: "var(--theme-primary)",
          borderTopWidth: "3px",
        } : undefined}
      >
        <div className="px-5 py-4">
          {/* Top row: title left, badge right */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {post.is_pinned && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold mb-1"
                  style={{ color: "var(--theme-primary)" }}
                >
                  <Pin size={11} />
                  Épinglé
                </span>
              )}
              <h3 className="font-semibold leading-tight text-[var(--foreground)]">
                {post.title}
              </h3>
            </div>
            <div className="shrink-0 mt-0.5">
              <PostTypeBadge type={post.type as PostType} />
            </div>
          </div>

          <p className="mt-2 line-clamp-2 text-sm text-[var(--muted-foreground)]">
            {post.body}
          </p>

          <div className="mt-3 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
            <span className="font-medium">{post.profiles?.display_name}</span>
            <span>·</span>
            <span>
              {new Date(post.created_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
              })}
            </span>
            {commentCount > 0 && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle size={12} />
                  {commentCount}
                </span>
              </>
            )}
            {post.type === "evenement" && rsvpCount > 0 && (
              <>
                <span>·</span>
                <span>
                  {rsvpCount} participant{rsvpCount > 1 ? "s" : ""}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
