"use client";

import { useRouter } from "next/navigation";
import { approveProducerAction, rejectProducerAction } from "@/app/admin/producer-actions";
import { PRODUCER_CATEGORIES } from "@rural-community-platform/shared";
import { Check, X } from "lucide-react";

interface PendingProducer {
  id: string;
  name: string;
  categories: string[];
  profiles: { display_name: string } | null;
  created_at: string;
}

interface PendingProducersProps {
  producers: PendingProducer[];
}

export function PendingProducers({ producers }: PendingProducersProps) {
  const router = useRouter();

  async function handleApprove(producerId: string) {
    await approveProducerAction(producerId);
    router.refresh();
  }

  async function handleReject(producerId: string) {
    await rejectProducerAction(producerId);
    router.refresh();
  }

  return (
    <div className="rounded-[14px] bg-white px-5 py-4 shadow-[0_1px_6px_rgba(160,130,90,0.06)]">
      <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">
        Producteurs en attente ({producers.length})
      </h2>
      {producers.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          Aucun producteur en attente.
        </p>
      ) : (
        <ul className="space-y-2">
          {producers.map((producer) => (
            <li
              key={producer.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--foreground)]">{producer.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {producer.categories?.map((category) => (
                    <span
                      key={category}
                      className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800"
                    >
                      {
                        PRODUCER_CATEGORIES.find((c) => c.value === category)
                          ?.label || category
                      }
                    </span>
                  ))}
                </div>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Par {producer.profiles?.display_name || "Anonyme"} •{" "}
                  {new Date(producer.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => handleApprove(producer.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600 transition-colors hover:bg-green-100"
                  aria-label="Approuver"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => handleReject(producer.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-colors hover:bg-red-100"
                  aria-label="Refuser"
                >
                  <X size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
