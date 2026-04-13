"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";

export function NavBar() {
  const router = useRouter();
  const { profile, loading, isAdmin } = useProfile();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  if (loading) return null;

  return (
    <nav className="border-b bg-white px-4 py-3">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/app/feed" className="font-semibold">
            {profile?.communes?.name ?? "Ma Commune"}
          </Link>
          <Link
            href="/app/feed"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Fil
          </Link>
          {isAdmin && (
            <Link
              href="/admin/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Admin
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {profile?.display_name}
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Deconnexion
          </Button>
        </div>
      </div>
    </nav>
  );
}
