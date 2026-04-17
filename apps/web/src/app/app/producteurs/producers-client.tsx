"use client";

import type { Producer } from "@rural-community-platform/shared";
import { useProfile } from "@/hooks/queries/use-profile";
import { useProducers } from "@/hooks/queries/use-producers";
import { ProducersContent } from "./producers-content";

export function ProducersClient({ userId }: { userId: string }) {
  const { data: profile } = useProfile(userId);
  const { data: producers } = useProducers(profile?.commune_id ?? "");

  if (!profile) return null;

  return (
    <ProducersContent
      producers={(producers ?? []) as Producer[]}
      communeId={profile.commune_id}
    />
  );
}
