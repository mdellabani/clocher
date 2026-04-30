"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { POST_TYPE_LABELS } from "@pretou/shared";
import type { PostType } from "@pretou/shared";

const TYPE_OPTIONS: { value: PostType; label: string }[] = [
  { value: "annonce", label: POST_TYPE_LABELS.annonce },
  { value: "evenement", label: POST_TYPE_LABELS.evenement },
  { value: "entraide", label: POST_TYPE_LABELS.entraide },
  { value: "discussion", label: POST_TYPE_LABELS.discussion },
  { value: "service", label: POST_TYPE_LABELS.service },
];

const DATE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Toutes" },
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
];

interface FeedFiltersProps {
  types: string[];
  date: string;
  communes?: { id: string; name: string }[];
  selectedCommunes?: string[];
}

export function FeedFilters({ types, date, communes, selectedCommunes }: FeedFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeCount = types.length + (date ? 1 : 0) + (selectedCommunes?.length ?? 0);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function buildUrl(overrides: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (!value) {
        sp.delete(key);
      } else {
        sp.set(key, value);
      }
    }
    sp.delete("page");
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function toggleType(type: PostType) {
    const current = new Set(types);
    if (current.has(type)) current.delete(type);
    else current.add(type);
    router.push(buildUrl({ types: Array.from(current).join(",") }));
  }

  function clearTypes() {
    router.push(buildUrl({ types: "" }));
  }

  function setDate(value: string) {
    router.push(buildUrl({ date: value }));
  }

  function toggleCommune(communeId: string) {
    const current = new Set(selectedCommunes ?? []);
    if (current.has(communeId)) current.delete(communeId);
    else current.add(communeId);
    router.push(buildUrl({ communes: Array.from(current).join(",") }));
  }

  function clearCommunes() {
    router.push(buildUrl({ communes: "" }));
  }

  const allTypesSelected = types.length === 0;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-colors ${
          activeCount > 0
            ? "border border-[var(--theme-primary)] text-[var(--theme-primary)]"
            : "border border-[#e8dfd0] text-[var(--muted-foreground)] hover:border-[var(--theme-primary)]"
        }`}
      >
        <SlidersHorizontal size={13} />
        Filtres{activeCount > 0 ? ` (${activeCount})` : ""}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 w-80 rounded-xl border border-[#e8dfd0] bg-white p-4 shadow-lg space-y-4">
          {/* Type filters */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] mb-2">Catégorie</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={clearTypes}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  allTypesSelected
                    ? "bg-[var(--theme-primary)] text-white"
                    : "border border-[#e8dfd0] text-[var(--muted-foreground)] hover:border-[var(--theme-primary)]"
                }`}
              >
                Tout
              </button>
              {TYPE_OPTIONS.map((f) => {
                const isActive = types.includes(f.value);
                return (
                  <button
                    key={f.value}
                    onClick={() => toggleType(f.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-[var(--theme-primary)] text-white"
                        : "border border-[#e8dfd0] text-[var(--muted-foreground)] hover:border-[var(--theme-primary)]"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date filters */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] mb-2">Période</p>
            <div className="flex flex-wrap gap-1.5">
              {DATE_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setDate(f.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    date === f.value
                      ? "bg-[var(--theme-primary)] text-white"
                      : "border border-[#e8dfd0] text-[var(--muted-foreground)] hover:border-[var(--theme-primary)]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Commune filters (EPCI only) */}
          {communes && communes.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] mb-2">Communes</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={clearCommunes}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    (selectedCommunes?.length ?? 0) === 0
                      ? "bg-[var(--theme-primary)] text-white"
                      : "border border-[#e8dfd0] text-[var(--muted-foreground)] hover:border-[var(--theme-primary)]"
                  }`}
                >
                  Toutes
                </button>
                {communes.map((c) => {
                  const isActive = selectedCommunes?.includes(c.id) ?? false;
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleCommune(c.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-[var(--theme-primary)] text-white"
                          : "border border-[#e8dfd0] text-[var(--muted-foreground)] hover:border-[var(--theme-primary)]"
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
