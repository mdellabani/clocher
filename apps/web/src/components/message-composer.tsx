"use client";
import { useState, useTransition } from "react";
import { sendMessageAction } from "@/app/app/messages/actions";

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const trimmed = body.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!trimmed) return;
        start(async () => {
          await sendMessageAction({ conversationId, body: trimmed });
          setBody("");
        });
      }}
      className="mt-2 flex gap-2 border-t border-[#f0e0d0] pt-2"
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        maxLength={4000}
        placeholder="Votre message…"
        className="flex-1 resize-none rounded-md border border-[#f0e0d0] px-2 py-1 text-sm"
      />
      <button
        type="submit"
        disabled={!trimmed || pending}
        className="rounded-md bg-[#2a1a14] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        Envoyer
      </button>
    </form>
  );
}
