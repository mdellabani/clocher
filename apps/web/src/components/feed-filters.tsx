"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { POST_TYPE_LABELS } from "@rural-community-platform/shared";
import type { PostType } from "@rural-community-platform/shared";

const TYPE_OPTIONS: { value: PostType; label: string }[] = [
  { value: "annonce", label: POST_TYPE_LABELS.annonce },
  { value: "evenement", label: POST_TYPE_LABELS.evenement },
  { value: "entraide", label: POST_TYPE_LABELS.entraide },
  { value: "discussion", label: POST_TYPE_LABELS.discussion },
];

const DATE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Toutes" },
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
];

interface FeedFiltersProps {
  types: string[];
  date: string;
}

export function FeedFilters({ types, date }: FeedFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function buildUrl(overrides: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (!value) {
        sp.delete(key);
      } else {
        sp.set(key, value);
      }
    }
    // Reset page when filters change
    sp.delete("page");
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function toggleType(type: PostType) {
    const current = new Set(types);
    if (current.has(type)) {
      current.delete(type);
    } else {
      current.add(type);
    }
    const newTypes = Array.from(current).join(",");
    router.push(buildUrl({ types: newTypes }));
  }

  function clearTypes() {
    router.push(buildUrl({ types: "" }));
  }

  function setDate(value: string) {
    router.push(buildUrl({ date: value }));
  }

  const allSelected = types.length === 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* "Tout" pill */}
      <button
        onClick={clearTypes}
        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
          allSelected
            ? "bg-[var(--theme-primary)] text-white"
            : "bg-white border border-[#e8dfd0] text-[var(--muted-foreground)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]"
        }`}
      >
        Tout
      </button>

      {/* Type pills — multi-select */}
      {TYPE_OPTIONS.map((f) => {
        const isActive = types.includes(f.value);
        return (
          <button
            key={f.value}
            onClick={() => toggleType(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "bg-[var(--theme-primary)] text-white"
                : "bg-white border border-[#e8dfd0] text-[var(--muted-foreground)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]"
            }`}
          >
            {f.label}
          </button>
        );
      })}

      <span className="mx-1 text-[#d4c4a8]">|</span>

      {/* Date pills */}
      {DATE_OPTIONS.map((f) => (
        <button
          key={f.value}
          onClick={() => setDate(f.value)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            date === f.value
              ? "bg-[var(--theme-primary)] text-white"
              : "bg-white border border-[#e8dfd0] text-[var(--muted-foreground)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
