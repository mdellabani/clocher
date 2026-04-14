import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getPostById,
  getComments,
  getRsvpCounts,
  getRsvps,
  getProfile,
  getPollByPostId,
} from "@rural-community-platform/shared";
import type { PostType, RsvpStatus } from "@rural-community-platform/shared";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PostTypeBadge } from "@/components/post-type-badge";
import { CommentSection } from "@/components/comment-section";
import { RsvpButtons } from "@/components/rsvp-buttons";
import { DeletePostButton } from "@/components/delete-post-button";
import { PollDisplay } from "@/components/poll-display";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile) redirect("/auth/signup");
  if (profile.status === "pending") redirect("/auth/pending");

  const { data: post } = await getPostById(supabase, id);
  if (!post) notFound();

  const { data: comments } = await getComments(supabase, id);
  const counts = await getRsvpCounts(supabase, id);
  const { data: poll } = await getPollByPostId(supabase, id);

  let currentRsvpStatus: RsvpStatus | null = null;
  if (post.type === "evenement") {
    const { data: rsvps } = await getRsvps(supabase, id);
    const myRsvp = rsvps?.find((r) => r.user_id === user.id);
    currentRsvpStatus = (myRsvp?.status as RsvpStatus) ?? null;
  }

  const isEvent = post.type === "evenement";
  const canDelete = post.author_id === user.id || profile.role === "admin";
  const images = (post.post_images ?? []) as {
    id: string;
    storage_path: string;
  }[];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader className="space-y-3 pb-2">
          <div className="flex items-center gap-2">
            <PostTypeBadge type={post.type as PostType} />
            {post.is_pinned && (
              <span className="text-xs font-medium text-amber-600">
                Épinglé
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold leading-tight">{post.title}</h1>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{post.profiles?.display_name ?? "Anonyme"}</span>
              <span>
                {new Date(post.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            {canDelete && <DeletePostButton postId={id} />}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {post.body}
          </p>

          {images.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {images.map((img) => (
                <img
                  key={img.id}
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-images/${img.storage_path}`}
                  alt=""
                  className="rounded-md object-cover w-full max-h-64"
                />
              ))}
            </div>
          )}

          {isEvent && (
            <div className="rounded-md border p-3 space-y-1 text-sm">
              {post.event_date && (
                <div className="flex gap-2">
                  <span className="font-medium text-muted-foreground">
                    Date :
                  </span>
                  <span>
                    {new Date(post.event_date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
              {post.event_location && (
                <div className="flex gap-2">
                  <span className="font-medium text-muted-foreground">
                    Lieu :
                  </span>
                  <span>{post.event_location}</span>
                </div>
              )}
            </div>
          )}

          {isEvent && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Votre disponibilité :</p>
              <RsvpButtons
                postId={id}
                currentStatus={currentRsvpStatus}
                counts={counts}
              />
            </div>
          )}

          {poll && <PollDisplay poll={poll} userId={user.id} />}
        </CardContent>
      </Card>

      <CommentSection
        postId={id}
        comments={comments ?? []}
        currentUserId={user.id}
        isAdmin={profile.role === "admin"}
      />
    </div>
  );
}
