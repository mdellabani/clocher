"use client";
import { useConversations } from "@/hooks/queries/use-conversations";
import { useRealtimeConversations } from "@/hooks/use-realtime-conversations";
import { useProfile } from "@/hooks/use-profile";
import { InboxList } from "@/components/inbox-list";

export function MessagesClient() {
  const { profile } = useProfile();
  const { data, isLoading, fetchNextPage, hasNextPage } = useConversations();
  useRealtimeConversations(profile?.id);

  if (isLoading) {
    return <p className="px-4 py-8 text-sm text-[#5a4030]">Chargement…</p>;
  }
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-bold text-[#2a1a14]">Messages</h1>
      <InboxList
        rows={data?.pages.flatMap((p) => p.rows) ?? []}
        onLoadMore={hasNextPage ? () => void fetchNextPage() : undefined}
      />
    </main>
  );
}
