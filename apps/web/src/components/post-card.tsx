import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PostTypeBadge } from "@/components/post-type-badge";
import type { Post, PostType } from "@rural-community-platform/shared";

export function PostCard({ post }: { post: Post }) {
  const commentCount = post.comments?.[0]?.count ?? 0;
  const rsvpCount =
    post.rsvps?.filter((r) => r.status === "going").length ?? 0;

  return (
    <Link href={`/app/posts/${post.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <PostTypeBadge type={post.type as PostType} />
              {post.is_pinned && (
                <span className="text-xs font-medium text-amber-600">
                  Epingle
                </span>
              )}
            </div>
            <h3 className="font-semibold leading-tight">{post.title}</h3>
          </div>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {post.body}
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span>{post.profiles?.display_name}</span>
            <span>
              {new Date(post.created_at).toLocaleDateString("fr-FR")}
            </span>
            {commentCount > 0 && (
              <span>
                {commentCount} commentaire{commentCount > 1 ? "s" : ""}
              </span>
            )}
            {post.type === "evenement" && rsvpCount > 0 && (
              <span>
                {rsvpCount} participant{rsvpCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
