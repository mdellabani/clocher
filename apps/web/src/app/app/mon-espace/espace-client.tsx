"use client";

import { useState } from "react";
import Link from "next/link";
import { Pin } from "lucide-react";
import {
  POST_TYPE_COLORS,
  POST_TYPE_LABELS,
  type PostType,
} from "@pretou/shared";
import { useProfile } from "@/hooks/use-profile";
import { useMyPosts } from "@/hooks/queries/use-my-posts";
import { useMyRsvps } from "@/hooks/queries/use-my-rsvps";

type Tab = "posts" | "rsvps";

type MyPost = {
  id: string;
  title: string;
  type: PostType;
  created_at: string;
  is_pinned: boolean;
};
type MyRsvpPost = {
  id: string;
  title: string;
  type: PostType;
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

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)}sem`;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "2-digit",
  });
}

function TypeChip({ type }: { type: PostType }) {
  const color = POST_TYPE_COLORS[type];
  return (
    <span
      className="shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-semibold"
      style={{ backgroundColor: `${color}33`, color }}
    >
      {POST_TYPE_LABELS[type]}
    </span>
  );
}

export function EspaceClient() {
  const { profile } = useProfile();
  const userId = profile?.id ?? "";
  const myPostsQuery = useMyPosts(userId);
  const myRsvpsQuery = useMyRsvps(userId);
  const [tab, setTab] = useState<Tab>("posts");

  if (!profile) return null;

  const posts = (myPostsQuery.data ?? []) as MyPost[];
  const rsvps = (myRsvpsQuery.data ?? []) as MyRsvp[];

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Mon espace"
        className="inline-flex rounded-full border border-[#f0e0d0] bg-white p-1"
      >
        <TabButton active={tab === "posts"} onClick={() => setTab("posts")}>
          Mes publications
        </TabButton>
        <TabButton active={tab === "rsvps"} onClick={() => setTab("rsvps")}>
          Mes participations
        </TabButton>
      </div>

      {tab === "posts" ? (
        posts.length === 0 ? (
          <EmptyState
            icon="📝"
            title="Aucune publication"
            subtitle="Vous n'avez encore rien publié."
          />
        ) : (
          <ul className="divide-y divide-[#f0e0d0] overflow-hidden rounded-xl border border-[#f0e0d0] bg-white">
            {posts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/app/posts/${p.id}`}
                  className="flex items-start gap-3 px-4 py-3 transition hover:bg-[#f5dbc8]/40"
                >
                  <TypeChip type={p.type} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      {p.is_pinned && (
                        <Pin className="h-3 w-3 shrink-0 text-[var(--theme-primary)]" />
                      )}
                      <span className="truncate text-[14px] font-medium text-[#2a1a14]">
                        {p.title}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#7a5e4d]">
                      {formatRelative(p.created_at)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : rsvps.length === 0 ? (
        <EmptyState
          icon="📅"
          title="Aucune participation"
          subtitle="Vos RSVP apparaîtront ici."
        />
      ) : (
        <ul className="divide-y divide-[#f0e0d0] overflow-hidden rounded-xl border border-[#f0e0d0] bg-white">
          {rsvps.map((r, i) => {
            const post = firstOrSame(r.posts);
            if (!post) {
              return (
                <li key={i} className="px-4 py-3 text-sm text-[#7a5e4d]">
                  Événement supprimé
                </li>
              );
            }
            return (
              <li key={i}>
                <Link
                  href={`/app/posts/${post.id}`}
                  className="flex items-start gap-3 px-4 py-3 transition hover:bg-[#f5dbc8]/40"
                >
                  <TypeChip type={post.type} />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-[#2a1a14]">
                      {post.title}
                    </span>
                    {post.event_date && (
                      <p className="mt-1 text-xs text-[#7a5e4d]">
                        {new Date(post.event_date).toLocaleString("fr-FR")}
                      </p>
                    )}
                    {post.event_location && (
                      <p className="text-xs text-[#7a5e4d]">
                        {post.event_location}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-[var(--theme-primary)] text-white"
          : "text-[#7a5e4d] hover:text-[#2a1a14]"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#f0e0d0] bg-white py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f5dbc8] text-2xl">
        {icon}
      </div>
      <p className="text-base font-semibold text-[#2a1a14]">{title}</p>
      <p className="max-w-xs text-sm text-[#7a5e4d]">{subtitle}</p>
    </div>
  );
}
