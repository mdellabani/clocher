"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { useMessages } from "@/hooks/queries/use-messages";
import { useRealtimeThread } from "@/hooks/use-realtime-thread";
import { MessageThread } from "@/components/message-thread";
import { MessageComposer } from "@/components/message-composer";
import { CrossCommuneBanner } from "@/components/cross-commune-banner";
import { BlockUserDialog } from "@/components/block-user-dialog";
import { ReportConversationDialog } from "@/components/report-conversation-dialog";
import { markReadAction } from "../actions";

export function ThreadClient(props: {
  conversationId: string;
  myUserId: string;
  counterpart: {
    id: string;
    display_name: string;
    commune: { id: string; name: string; slug: string } | null;
  };
  post: { id: string; title: string; type: string };
  isCrossCommune: boolean;
}) {
  const { data, isLoading } = useMessages(props.conversationId);
  useRealtimeThread(props.conversationId);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    void markReadAction(props.conversationId)
      .then(() => {
        // Tell the inbox + nav badge to refetch so the unread state clears
        // when the user navigates back. Realtime UPDATE on conversations
        // would do this on its own, but only if useRealtimeConversations is
        // mounted — which it isn't on the thread page.
        qc.invalidateQueries({ queryKey: queryKeys.conversations.all });
        qc.invalidateQueries({ queryKey: queryKeys.conversations.unreadCount });
      })
      .catch(() => {});
  }, [props.conversationId, data, qc]);

  const messages = data?.pages.flatMap((p) => p.messages) ?? [];

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // The parent <main> in app/layout.tsx has py-6 (3rem) and the NavBar is ~5rem.
  // Subtract ~8rem so the conversation fills the rest of the viewport without
  // pushing the page into a scroll. dvh handles mobile browser chrome correctly.
  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-2xl flex-col overflow-hidden rounded-lg border border-[#f0e0d0] bg-[#fbf3eb] shadow-sm">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#f0e0d0] bg-[#fbf3eb] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/app/messages"
            aria-label="Retour à la boîte de réception"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#5a4030] hover:bg-[#f0e0d0]"
          >
            <span aria-hidden>←</span>
          </Link>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5dbc8] text-base font-semibold text-[#2a1a14]">
            {props.counterpart.display_name.trim().charAt(0).toUpperCase() ||
              "?"}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-[#2a1a14]">
              {props.counterpart.display_name}
            </h1>
            <p className="truncate text-xs text-[#7a5e4d]">
              à propos de :{" "}
              <span className="font-medium text-[#5a4030]">
                {props.post.title}
              </span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ReportConversationDialog conversationId={props.conversationId} />
          <BlockUserDialog blockedId={props.counterpart.id} />
        </div>
      </header>

      {props.isCrossCommune && props.counterpart.commune && (
        <div className="shrink-0 px-4 pt-2">
          <CrossCommuneBanner communeName={props.counterpart.commune.name} />
        </div>
      )}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-2"
      >
        {isLoading ? (
          <p className="my-4 text-sm text-[#5a4030]">Chargement…</p>
        ) : (
          <MessageThread
            messages={messages}
            myUserId={props.myUserId}
            counterpartName={props.counterpart.display_name}
          />
        )}
      </div>

      <div className="shrink-0 border-t border-[#f0e0d0] bg-[#fbf3eb] px-4 pb-3 pt-2">
        <MessageComposer
          conversationId={props.conversationId}
          myUserId={props.myUserId}
        />
      </div>
    </div>
  );
}
