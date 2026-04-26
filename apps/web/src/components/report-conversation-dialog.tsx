"use client";
import { useState, useTransition } from "react";
import { reportConversationAction } from "@/app/app/messages/actions";

export function ReportConversationDialog({
  conversationId,
}: {
  conversationId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const close = () => {
    setOpen(false);
    setReason("");
    setDone(false);
  };
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-[#7a5e4d] underline"
      >
        Signaler
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <div className="w-full max-w-sm rounded-md bg-white p-4 shadow-lg">
            {done ? (
              <>
                <p className="text-sm text-[#2a1a14]">
                  Merci. La conversation a été signalée.
                </p>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-md bg-[#2a1a14] px-3 py-1 text-sm text-white"
                  >
                    Fermer
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm">
                  Signaler cette conversation à l&apos;équipe de modération.
                </p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Motif (facultatif)"
                  className="mt-2 w-full resize-none rounded-md border border-[#f0e0d0] px-2 py-1 text-sm"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-md border px-3 py-1 text-sm"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await reportConversationAction({
                          conversationId,
                          reason: reason.trim() || undefined,
                        });
                        setDone(true);
                      })
                    }
                    className="rounded-md bg-[#BF3328] px-3 py-1 text-sm text-white disabled:opacity-50"
                  >
                    Signaler
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
