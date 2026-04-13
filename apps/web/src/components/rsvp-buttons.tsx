"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setRsvpAction, removeRsvpAction } from "@/app/app/posts/[id]/actions";
import type { RsvpStatus } from "@rural-community-platform/shared";

interface RsvpButtonsProps {
  postId: string;
  currentStatus: RsvpStatus | null;
  counts: { going: number; maybe: number; not_going: number };
}

const OPTIONS: { status: RsvpStatus; label: string }[] = [
  { status: "going", label: "J'y vais" },
  { status: "maybe", label: "Peut-être" },
  { status: "not_going", label: "Pas dispo" },
];

export function RsvpButtons({
  postId,
  currentStatus,
  counts,
}: RsvpButtonsProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick(status: RsvpStatus) {
    startTransition(async () => {
      if (currentStatus === status) {
        await removeRsvpAction(postId);
      } else {
        await setRsvpAction(postId, status);
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
