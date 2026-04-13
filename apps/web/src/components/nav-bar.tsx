"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { LogOut } from "lucide-react";

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

  const communeName = profile?.communes?.name ?? "Ma Commune";
  const codePostal = profile?.communes?.code_postal;
  const motto = profile?.communes?.motto;
  const initials = (profile?.display_name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <nav
      className="relative overflow-hidden px-4 py-4"
      style={{
        background:
          "linear-gradient(145deg, var(--theme-gradient-1), var(--theme-gradient-2), var(--theme-gradient-3))",
      }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/[0.06]" />
      <div className="absolute -bottom-16 -left-8 h-48 w-48 rounded-full bg-white/[0.06]" />
      <div className="absolute top-4 right-1/3 h-20 w-20 rounded-full bg-white/[0.06]" />

      <div className="relative mx-auto flex max-w-5xl items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <Link href="/app/feed" className="text-xl font-semibold text-white">
              {communeName}
            </Link>
            {codePostal && (
              <p className="text-xs text-white/65">
                {codePostal}
              </p>
            )}
          </div>

          {motto && (
            <span className="hidden sm:inline-block rounded-lg bg-white/10 px-3 py-1 text-xs italic text-white/80 backdrop-blur-sm">
              {motto}
            </span>
          )}

          <div className="flex items-center gap-4">
            <Link
              href="/app/feed"
              className="text-sm text-white/70 transition-colors hover:text-white"
            >
              Fil
            </Link>
            <Link
              href="/app/infos-pratiques"
              className="text-sm text-white/70 transition-colors hover:text-white"
            >
              Infos pratiques
            </Link>
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className="text-sm text-white/70 transition-colors hover:text-white"
              >
                Admin
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-white/90">
            {profile?.display_name}
          </span>
          <Link
            href="/app/settings"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/30 bg-white/15 text-xs font-semibold text-white transition-colors hover:bg-white/25"
            title="Paramètres"
          >
            {initials}
          </Link>
          <button
            onClick={handleLogout}
            className="text-white/70 transition-colors hover:text-white"
            aria-label="Déconnexion"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
