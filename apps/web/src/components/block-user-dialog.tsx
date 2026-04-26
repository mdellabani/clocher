"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { blockUserAction } from "@/app/app/messages/actions";

export function BlockUserDialog({ blockedId }: { blockedId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-[#BF3328] underline"
      >
        Bloquer
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <div className="max-w-sm rounded-md bg-white p-4 shadow-lg">
            <p className="text-sm">
              Bloquer cet utilisateur&nbsp;? Vous ne verrez plus ses
              publications ni ses messages.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border px-3 py-1 text-sm"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await blockUserAction(blockedId);
                    setOpen(false);
                    router.push("/app/messages");
                  })
                }
                className="rounded-md bg-[#BF3328] px-3 py-1 text-sm text-white disabled:opacity-50"
              >
                Bloquer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
