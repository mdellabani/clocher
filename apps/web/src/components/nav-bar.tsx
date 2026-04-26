"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { LogOut } from "lucide-react";

export function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, loading, isAdmin, isModerator } = useProfile();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  if (loading) {
    return (
      <nav
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(145deg, var(--theme-gradient-1), var(--theme-gradient-2), var(--theme-gradient-3))",
        }}
      >
        <div className="mx-auto max-w-5xl px-5 pt-4 pb-3">
          <div className="h-7 w-40 rounded bg-white/20 animate-pulse" />
          <div className="mt-3 flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-7 w-20 rounded bg-white/10 animate-pulse" />
            ))}
          </div>
        </div>
      </nav>
    );
  }

  const navLinkClass = (href: string) => {
    const isActive = pathname === href || pathname.startsWith(href + "/");
    return isActive
      ? "rounded-md px-3 py-1.5 text-sm font-semibold text-white bg-white/20"
      : "rounded-md px-3 py-1.5 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white";
  };

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
      className="relative overflow-hidden"
      style={{
        background:
          "linear-gradient(145deg, var(--theme-gradient-1), var(--theme-gradient-2), var(--theme-gradient-3))",
      }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/[0.06]" />
      <div className="absolute -bottom-16 -left-8 h-48 w-48 rounded-full bg-white/[0.06]" />

      {/* Top row: commune identity + user */}
      <div className="relative mx-auto flex max-w-5xl items-center justify-between px-5 pt-4 pb-2">
        <div>
          <Link href="/app/feed" className="text-xl font-semibold text-white">
            {communeName}
          </Link>
          {motto ? (
            <p className="text-xs italic text-white/60">{motto}</p>
          ) : codePostal ? (
            <p className="text-xs text-white/50">{codePostal}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/app/settings"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-white/15 text-xs font-semibold text-white transition-colors hover:bg-white/25"
            title={profile?.display_name ?? "Paramètres"}
          >
            {initials}
          </Link>
          <button
            onClick={handleLogout}
            className="text-white/60 transition-colors hover:text-white"
            aria-label="Déconnexion"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bottom row: navigation */}
      <div className="relative mx-auto flex max-w-5xl items-center gap-1 px-5 pb-3">
        <Link href="/app/feed" className={navLinkClass("/app/feed")}>
          Fil
        </Link>
        <Link href="/app/evenements" className={navLinkClass("/app/evenements")}>
          Événements
        </Link>
        <Link href="/app/mon-espace" className={navLinkClass("/app/mon-espace")}>
          Mon espace
        </Link>
        <Link href="/app/infos-pratiques" className={navLinkClass("/app/infos-pratiques")}>
          Infos pratiques
        </Link>
        {isAdmin && (
          <Link href="/admin/dashboard" className={navLinkClass("/admin")}>
            Admin
          </Link>
        )}
      </div>
    </nav>
  );
}
