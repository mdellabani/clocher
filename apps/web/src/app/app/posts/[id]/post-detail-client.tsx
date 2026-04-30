"use client";

import { notFound } from "next/navigation";
import type { PostType } from "@pretou/shared";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PostTypeBadge } from "@/components/post-type-badge";
import { RsvpButtons } from "@/components/rsvp-buttons";
import { DeletePostButton } from "@/components/delete-post-button";
import { PollDisplay } from "@/components/poll-display";
import { ContacterButton } from "@/components/contacter-button";
import { AnnonceContactBlock } from "@/components/annonce-contact-block";
import { usePostDetail } from "@/hooks/queries/use-post-detail";
import { useProfile } from "@/hooks/use-profile";

function formatOpeningHours(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const entries = Object.entries(value as Record<string, string>).filter(
    ([, v]) => typeof v === "string" && v.trim(),
  );
  if (entries.length === 0) return null;
  return entries
    .map(([day, time]) => `${day.charAt(0).toUpperCase() + day.slice(1)} : ${time}`)
    .join(" · ");
}

interface PostDetailClientProps {
  postId: string;
}

export function PostDetailClient({ postId }: PostDetailClientProps) {
  const { profile } = useProfile();
  const { data: post, isLoading } = usePostDetail(postId);

  if (isLoading && !post) return null;
  if (!post) {
    notFound();
  }
  if (!profile) return null;

  const userId = profile.id;
  const userRole = profile.role;
  const isEvent = post.type === "evenement";
  const canDelete = post.author_id === userId || userRole === "admin";
  const images = (post.post_images ?? []) as { id: string; storage_path: string }[];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader className="space-y-3 pb-2">
          <div className="flex items-center gap-2">
            <PostTypeBadge type={post.type as PostType} />
            {post.is_pinned && (
              <span className="text-xs font-medium text-amber-600">Épinglé</span>
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
            {canDelete && <DeletePostButton postId={postId} />}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.body}</p>

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
                  <span className="font-medium text-muted-foreground">Date :</span>
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
                  <span className="font-medium text-muted-foreground">Lieu :</span>
                  <span>{post.event_location}</span>
                </div>
              )}
            </div>
          )}

          {isEvent && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Votre disponibilité :</p>
              <RsvpButtons postId={postId} userId={userId} />
            </div>
          )}

          <PollDisplay postId={postId} userId={userId} />

          {post.type === "annonce" ? (
            <AnnonceContactBlock
              phone={post.communes?.phone ?? null}
              email={post.communes?.email ?? null}
              openingHours={formatOpeningHours(post.communes?.opening_hours)}
            />
          ) : (
            <ContacterButton
              postId={postId}
              postType={post.type}
              authorId={post.author_id}
              viewerId={userId}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
