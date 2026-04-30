"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Post, PostListFilters } from "@pretou/shared";
import { queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

type InfinitePostsData = { pages: Post[][]; pageParams: (string | null)[] };

function prependToFirstPage(
  data: InfinitePostsData | undefined,
  post: Post,
): InfinitePostsData {
  const firstPage = data?.pages[0] ?? [];
  const rest = data?.pages.slice(1) ?? [];
  return {
    pages: [[post, ...firstPage], ...rest],
    pageParams: data?.pageParams ?? [null],
  };
}

function patchInPlace(
  data: InfinitePostsData | undefined,
  post: Post,
): InfinitePostsData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) =>
      page.map((p) => (p.id === post.id ? { ...p, ...post } : p)),
    ),
  };
}

function removeFromPages(
  data: InfinitePostsData | undefined,
  postId: string,
): InfinitePostsData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => page.filter((p) => p.id !== postId)),
  };
}

export function useRealtimePosts(communeId: string, filters: PostListFilters) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!communeId) return;
    const supabase = createClient();
    const key = queryKeys.posts.list(communeId, filters);
    const pinnedKey = queryKeys.posts.pinned(communeId);

    const channel = supabase
      .channel(`posts:${communeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `commune_id=eq.${communeId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const inserted = payload.new as Post;
            if (!inserted.is_hidden) {
              if (inserted.is_pinned) {
                qc.setQueryData<Post[]>(pinnedKey, (old = []) => [inserted, ...old]);
              } else {
                qc.setQueryData<InfinitePostsData>(key, (old) => prependToFirstPage(old, inserted));
              }
              qc.invalidateQueries({ queryKey: key });
              qc.invalidateQueries({ queryKey: pinnedKey });
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Post;
            qc.setQueryData<InfinitePostsData>(key, (old) => patchInPlace(old, updated));
            qc.setQueryData<Post[]>(pinnedKey, (old = []) =>
              old.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
            );
            qc.invalidateQueries({ queryKey: key });
            qc.invalidateQueries({ queryKey: pinnedKey });
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            qc.setQueryData<InfinitePostsData>(key, (old) => removeFromPages(old, deleted.id));
            qc.setQueryData<Post[]>(pinnedKey, (old = []) => old.filter((p) => p.id !== deleted.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [communeId, qc, filters]);
}
