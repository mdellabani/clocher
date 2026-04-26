"use client";

import Link from "next/link";
import { useProfile } from "@/hooks/use-profile";
import { useMyPosts } from "@/hooks/queries/use-my-posts";
import { useMyRsvps } from "@/hooks/queries/use-my-rsvps";

type MyPost = {
  id: string;
  title: string;
  type: string;
  created_at: string;
  is_pinned: boolean;
};
type MyRsvpPost = {
  id: string;
  title: string;
  type: string;
  event_date: string | null;
  event_location: string | null;
};
type MyRsvp = {
  status: string;
  posts: MyRsvpPost | MyRsvpPost[] | null;
};

function firstOrSame<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export function EspaceClient() {
  const { profile } = useProfile();
  const userId = profile?.id ?? "";
  const myPostsQuery = useMyPosts(userId);
  const myRsvpsQuery = useMyRsvps(userId);

  if (!profile) return null;

  const posts = (myPostsQuery.data ?? []) as MyPost[];
  const rsvps = (myRsvpsQuery.data ?? []) as MyRsvp[];

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
          Mes publications
        </h2>
        {posts.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Aucune publication pour le moment.
          </p>
        ) : (
          <ul className="space-y-2">
            {posts.map((p) => (
              <li key={p.id} className="rounded-xl border bg-white p-4">
                <Link href={`/app/posts/${p.id}`} className="font-medium hover:underline">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
          Mes participations
        </h2>
        {rsvps.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Aucune participation enregistrée.
          </p>
        ) : (
          <ul className="space-y-2">
            {rsvps.map((r, i) => {
              const post = firstOrSame(r.posts);
              return (
                <li key={i} className="rounded-xl border bg-white p-4">
                  {post?.id ? (
                    <Link href={`/app/posts/${post.id}`} className="font-medium hover:underline">
                      {post.title}
                    </Link>
                  ) : (
                    <span className="font-medium">Événement supprimé</span>
                  )}
                  {post?.event_date && (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {new Date(post.event_date).toLocaleString("fr-FR")}
                    </p>
                  )}
                  {post?.event_location && (
                    <p className="text-xs text-[var(--muted-foreground)]">{post.event_location}</p>
                  )}
                  <p className="text-xs text-[var(--muted-foreground)]">Statut : {r.status}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
