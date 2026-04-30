"use client";
import { useState, useTransition, useRef, type KeyboardEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys, type MessageRow } from "@pretou/shared";
import { sendMessageAction } from "@/app/app/messages/actions";

type MessagesPage = { messages: MessageRow[]; nextCursor: string | null };
type MessagesData = { pages: MessagesPage[]; pageParams: unknown[] };

export function MessageComposer({
  conversationId,
  myUserId,
}: {
  conversationId: string;
  myUserId?: string;
}) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const qc = useQueryClient();
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const trimmed = body.trim();

  const submit = () => {
    if (!trimmed || pending) return;
    const optimisticId = `optimistic-${Date.now()}`;
    const now = new Date().toISOString();
    const queryKey = queryKeys.conversations.messages(conversationId);

    if (myUserId) {
      qc.setQueryData<MessagesData>(queryKey, (prev) => {
        if (!prev || prev.pages.length === 0) {
          return {
            pages: [
              {
                messages: [
                  {
                    id: optimisticId,
                    conversation_id: conversationId,
                    sender_id: myUserId,
                    body: trimmed,
                    created_at: now,
                  } as MessageRow,
                ],
                nextCursor: null,
              },
            ],
            pageParams: [undefined],
          };
        }
        const lastIdx = prev.pages.length - 1;
        const lastPage = prev.pages[lastIdx];
        const newLast: MessagesPage = {
          ...lastPage,
          messages: [
            ...lastPage.messages,
            {
              id: optimisticId,
              conversation_id: conversationId,
              sender_id: myUserId,
              body: trimmed,
              created_at: now,
            } as MessageRow,
          ],
        };
        return {
          ...prev,
          pages: [...prev.pages.slice(0, lastIdx), newLast],
        };
      });
    }

    setBody("");
    start(async () => {
      try {
        await sendMessageAction({ conversationId, body: trimmed });
      } finally {
        qc.invalidateQueries({ queryKey });
      }
    });
    requestAnimationFrame(() => taRef.current?.focus());
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-end gap-2"
    >
      <textarea
        ref={taRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        maxLength={4000}
        placeholder="Votre message…"
        aria-label="Votre message"
        className="flex-1 resize-none rounded-2xl border border-[#e6d3c0] bg-white px-4 py-2.5 text-sm leading-5 text-[#2a1a14] placeholder:text-[#a78a76] focus:border-[#2a1a14] focus:outline-none focus:ring-2 focus:ring-[#2a1a14]/15"
      />
      <button
        type="submit"
        disabled={!trimmed || pending}
        aria-label="Envoyer"
        className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-[#2a1a14] px-4 text-sm font-semibold text-white transition hover:bg-[#1a0e09] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Envoyer
      </button>
    </form>
  );
}
