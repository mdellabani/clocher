"use client";

import { useState, useMemo } from "react";
import { Search, Grid, List, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProducerCard } from "./producer-card";
import { CreateProducerDialog } from "./create-producer-dialog";
import { PRODUCER_CATEGORIES } from "@rural-community-platform/shared";
import type { Producer } from "@rural-community-platform/shared";

type ViewMode = "list" | "grid";

export function ProducersContent({ producers, communeId }: { producers: Producer[]; communeId: string }) {
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const filteredProducers = useMemo(() => {
    return producers.filter((producer) => {
      const matchesSearch =
        search === "" ||
        producer.name.toLowerCase().includes(search.toLowerCase()) ||
        producer.description.toLowerCase().includes(search.toLowerCase());

      const matchesCategories =
        selectedCategories.length === 0 ||
        selectedCategories.some((cat) => producer.categories?.includes(cat));

      return matchesSearch && matchesCategories;
    });
  }, [producers, search, selectedCategories]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={18} />
        <Input
          type="text"
          placeholder="Rechercher par nom ou description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        {PRODUCER_CATEGORIES.map((category) => (
          <button
            key={category.value}
            onClick={() => toggleCategory(category.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedCategories.includes(category.value)
                ? "bg-green-600 text-white"
                : "bg-green-100 text-green-800 hover:bg-green-200"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* View toggle and create button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="gap-2"
          >
            <List size={16} />
            Liste
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="gap-2"
          >
            <Grid size={16} />
            Grille
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled
            title="Bientôt disponible"
            className="gap-2"
          >
            <Map size={16} />
            Carte
          </Button>
        </div>
        <CreateProducerDialog communeId={communeId} />
      </div>

      {/* Results */}
      {filteredProducers.length > 0 ? (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3"
              : "space-y-4"
          }
        >
          {filteredProducers.map((producer) => (
            <ProducerCard
              key={producer.id}
              producer={producer}
              viewMode={viewMode}
            />
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-[var(--muted-foreground)]">
          Aucun producteur ne correspond à votre recherche.
        </p>
      )}
    </div>
  );
}
