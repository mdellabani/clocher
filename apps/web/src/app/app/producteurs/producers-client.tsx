"use client";

import type { Producer } from "@pretou/shared";
import { useProfile } from "@/hooks/use-profile";
import { useProducers } from "@/hooks/queries/use-producers";
import { ProducersContent } from "./producers-content";

export function ProducersClient() {
  const { profile } = useProfile();
  const { data: producers } = useProducers(profile?.commune_id ?? "");

  if (!profile) return null;

  return (
    <ProducersContent
      producers={(producers ?? []) as Producer[]}
      communeId={profile.commune_id}
    />
  );
}
