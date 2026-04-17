"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 transition-all ${
        scrolled
          ? "border-b border-[#f0e0d0] bg-white/90 backdrop-blur"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#BF3328] via-[#D35230] to-[#E49035] text-base font-bold text-white">
            ◉
          </span>
          <span className="text-base font-bold tracking-tight text-[#2a1a14]">
            Ma Commune
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          <a href="#residents" className="text-sm font-medium text-[#5a4030] transition-colors hover:text-[#BF3328]">
            Pour les résidents
          </a>
          <a href="#mairies" className="text-sm font-medium text-[#5a4030] transition-colors hover:text-[#BF3328]">
            Pour les mairies
          </a>
          <a href="#communes" className="text-sm font-medium text-[#5a4030] transition-colors hover:text-[#BF3328]">
            Communes
          </a>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-[#5a4030] transition-colors hover:bg-[#FDF0EB] hover:text-[#BF3328]"
          >
            Se connecter
          </Link>
          <Link
            href="/auth/register-commune"
            className="rounded-lg bg-[#D35230] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#BF3328] hover:shadow"
          >
            Inscrire ma mairie
          </Link>
        </div>
      </div>
    </nav>
  );
}
