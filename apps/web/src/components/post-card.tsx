import Link from "next/link";
import Image from "next/image";
import { PostTypeBadge } from "@/components/post-type-badge";
import { ReportDialog } from "@/components/report-dialog";
import type { Post, PostType } from "@rural-community-platform/shared";
import { Pin, MessageCircle } from "lucide-react";

function getImageUrl(storagePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return `${supabaseUrl}/storage/v1/object/public/post-images/${storagePath}`;
}

export function PostCard({ post }: { post: Post }) {
  const commentCount = post.comments?.[0]?.count ?? 0;
  const rsvpCount =
    post.rsvps?.filter((r) => r.status === "going").length ?? 0;

  const getExpiryText = () => {
    if (!post.expires_at) return null;
    const expiryDate = new Date(post.expires_at);
    const now = new Date();
    const daysRemaining = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysRemaining < 1) return "Expire aujourd'hui";
    return `Expire dans ${daysRemaining}j`;
  };

  return (
    <Link href={`/app/posts/${post.id}`} className="block">
      <div
        data-testid="post-card"
        className="relative bg-white rounded-[14px] border border-[#f0e8da] shadow-[0_2px_8px_rgba(140,120,80,0.08)] transition-all hover:shadow-[0_4px_16px_rgba(140,120,80,0.14)] hover:-translate-y-0.5"
        style={post.is_pinned ? {
          borderTopColor: "var(--theme-primary)",
          borderTopWidth: "3px",
        } : undefined}
      >
        <div className="flex gap-4 px-5 py-4">
          {post.post_images && post.post_images.length > 0 && (
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
              <Image
                src={getImageUrl(post.post_images[0].storage_path)}
                alt=""
                fill
                className="object-cover"
                sizes="96px"
                unoptimized={process.env.NODE_ENV === "development"}
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
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

            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[var(--muted-foreground)]">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {post.communes?.name && (
                  <>
                    <span className="font-medium text-[var(--theme-primary)]">{post.communes.name}</span>
                    <span>·</span>
                  </>
                )}
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
                {post.type === "service" && post.expires_at && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
                      {getExpiryText()}
                    </span>
                  </>
                )}
              </div>
              <ReportDialog postId={post.id} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
