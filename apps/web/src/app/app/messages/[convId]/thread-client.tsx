"use client";
import { useEffect } from "react";
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

  useEffect(() => {
    void markReadAction(props.conversationId).catch(() => {});
  }, [props.conversationId, data]);

  const messages = data?.pages.flatMap((p) => p.messages) ?? [];

  return (
    <main className="mx-auto flex max-w-2xl flex-col px-4 py-4">
      <header className="mb-2 flex items-start justify-between gap-3 border-b border-[#f0e0d0] pb-2">
        <div>
          <h1 className="text-lg font-bold text-[#2a1a14]">
            {props.counterpart.display_name}
          </h1>
          <p className="text-xs text-[#7a5e4d]">
            à propos de : {props.post.title}
          </p>
        </div>
        <div className="flex gap-3">
          <ReportConversationDialog conversationId={props.conversationId} />
          <BlockUserDialog blockedId={props.counterpart.id} />
        </div>
      </header>
      {props.isCrossCommune && props.counterpart.commune && (
        <CrossCommuneBanner communeName={props.counterpart.commune.name} />
      )}
      {isLoading ? (
        <p className="my-4 text-sm text-[#5a4030]">Chargement…</p>
      ) : (
        <MessageThread messages={messages} myUserId={props.myUserId} />
      )}
      <MessageComposer conversationId={props.conversationId} />
    </main>
  );
}
