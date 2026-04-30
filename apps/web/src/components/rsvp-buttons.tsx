"use client";

import { useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { Button } from "@/components/ui/button";
import { setRsvpAction, removeRsvpAction } from "@/app/app/posts/[id]/actions";
import type { RsvpStatus } from "@pretou/shared";
import { useRsvps } from "@/hooks/queries/use-rsvps";

interface RsvpButtonsProps {
  postId: string;
  userId: string;
}

const OPTIONS: { status: RsvpStatus; label: string }[] = [
  { status: "going", label: "J'y vais" },
  { status: "maybe", label: "Peut-être" },
  { status: "not_going", label: "Pas dispo" },
];

export function RsvpButtons({ postId, userId }: RsvpButtonsProps) {
  const qc = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const { data } = useRsvps(postId, userId);
  const counts = data?.counts ?? { going: 0, maybe: 0, not_going: 0 };
  const currentStatus = data?.myStatus ?? null;

  function handleClick(status: RsvpStatus) {
    startTransition(async () => {
      const result =
        currentStatus === status
          ? await removeRsvpAction(postId)
          : await setRsvpAction(postId, status);
      if (!result.error) {
        qc.invalidateQueries({ queryKey: queryKeys.rsvps(postId) });
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map(({ status, label }) => {
        const isActive = currentStatus === status;
        const count = counts[status];
        return (
          <Button
            key={status}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => handleClick(status)}
            disabled={isPending}
          >
            {label}
            {count > 0 && (
              <span className="ml-1.5 rounded-full bg-background/20 px-1.5 py-0.5 text-xs font-medium">
                {count}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
