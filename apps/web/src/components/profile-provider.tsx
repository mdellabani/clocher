"use client";

import { ProfileProvider } from "@/hooks/use-profile";

export function ProfileProviderWrapper({ children }: { children: React.ReactNode }) {
  return <ProfileProvider>{children}</ProfileProvider>;
}
