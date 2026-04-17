"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Post, PostListFilters } from "@rural-community-platform/shared";
import { PostCard } from "@/components/post-card";
import { FeedFilters } from "@/components/feed-filters";
import { CreatePostDialog } from "@/components/create-post-dialog";
import { useProfile } from "@/hooks/queries/use-profile";
import { usePinnedPosts } from "@/hooks/queries/use-pinned-posts";
import { usePosts } from "@/hooks/queries/use-posts";
import { useEpciPosts } from "@/hooks/queries/use-epci-posts";
import { useEpciCommunes } from "@/hooks/queries/use-epci-communes";
import { useProducerCount } from "@/hooks/queries/use-producer-count";

function parseCsv(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").filter(Boolean);
}

export function FeedClient({ userId }: { userId: string }) {
  const { data: profile } = useProfile(userId);
  const params = useSearchParams();
  const scope = params.get("scope") === "epci" ? "epci" : "commune";
  const selectedTypes = parseCsv(params.get("types"));
  const dateFilter = params.get("date") ?? "";
  const selectedCommuneIds = parseCsv(params.get("communes"));

  const communeId = profile?.commune_id ?? "";
  const epciId = profile?.communes?.epci_id ?? null;

  const pinned = usePinnedPosts(scope === "commune" ? communeId : "");
  const communePosts = usePosts(scope === "commune" ? communeId : "", {
    types: selectedTypes,
    dateFilter: dateFilter as PostListFilters["dateFilter"],
  });
  const epciPosts = useEpciPosts(
    scope === "epci" && epciId ? epciId : "",
    selectedCommuneIds.length > 0 ? selectedCommuneIds : undefined,
  );
  const epciCommunes = useEpciCommunes(scope === "epci" ? epciId : null);
  const producerCount = useProducerCount(communeId);

  const infiniteQuery = scope === "commune" ? communePosts : epciPosts;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMore = useCallback(() => {
    if (infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
      infiniteQuery.fetchNextPage();
    }
  }, [infiniteQuery]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(),
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (!profile) return null;

  const pinnedList: Post[] = (pinned.data ?? []) as Post[];
  const regular: Post[] = (infiniteQuery.data?.pages.flat() ?? []) as Post[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Fil de la commune</h1>
        <CreatePostDialog isAdmin={profile.role === "admin"} />
      </div>

      <div className="flex gap-3 text-sm">
        <Link
          href="/app/feed"
          className={scope === "commune"
            ? "font-semibold text-[var(--theme-primary)] underline underline-offset-4"
            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}
        >
          Ma commune
        </Link>
        <Link
          href="/app/feed?scope=epci"
          className={scope === "epci"
            ? "font-semibold text-[var(--theme-primary)] underline underline-offset-4"
            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}
        >
          Intercommunalité
        </Link>
      </div>

      <FeedFilters
        types={selectedTypes}
        date={dateFilter}
        communes={scope === "epci" ? (epciCommunes.data ?? []) : undefined}
        selectedCommunes={selectedCommuneIds}
      />

      {(producerCount.data ?? 0) > 0 && (
        <Link
          href="/app/producteurs"
          className="flex items-center justify-between rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 px-5 py-3.5 transition-shadow hover:shadow-md"
        >
          <div>
            <p className="text-sm font-bold text-green-800">🌿 Producteurs locaux</p>
            <p className="text-xs text-green-600">
              {producerCount.data} producteur{producerCount.data !== 1 ? "s" : ""} · Circuit court
            </p>
          </div>
          <span className="text-lg text-green-700">→</span>
        </Link>
      )}

      <div className="space-y-4">
        {pinnedList.map((post) => <PostCard key={post.id} post={post} />)}
        {regular.map((post) => <PostCard key={post.id} post={post} />)}
        {infiniteQuery.hasNextPage && (
          <div ref={sentinelRef} className="flex justify-center py-4">
            {infiniteQuery.isFetchingNextPage && (
              <p className="text-sm text-[var(--muted-foreground)]">Chargement...</p>
            )}
          </div>
        )}
        {!infiniteQuery.hasNextPage && regular.length > 0 && (
          <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">
            Aucune publication plus ancienne.
          </p>
        )}
        {pinnedList.length === 0 && regular.length === 0 && (
          <p className="py-8 text-center text-[var(--muted-foreground)]">
            Aucune publication pour cette sélection.
          </p>
        )}
      </div>
    </div>
  );
}
