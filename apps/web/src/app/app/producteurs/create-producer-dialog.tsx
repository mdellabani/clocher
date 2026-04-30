"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PRODUCER_CATEGORIES } from "@pretou/shared";
import { createProducerAction } from "./actions";

export function CreateProducerDialog({ communeId }: { communeId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("categories", JSON.stringify(selectedCategories));

    const result = await createProducerAction(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(async () => {
      setOpen(false);
      setSuccess(false);
      setSelectedCategories([]);
      (e.target as HTMLFormElement).reset();
      await qc.invalidateQueries({ queryKey: queryKeys.producers(communeId) });
    }, 2000);
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Ajouter un producteur</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une fiche producteur</DialogTitle>
        </DialogHeader>
        {success ? (
          <div className="py-8 text-center">
            <p className="text-sm text-green-600 font-medium">
              ✓ Votre fiche sera visible après validation par la mairie.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du producteur *</Label>
              <Input id="name" name="name" required maxLength={200} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                required
                maxLength={1000}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Catégories *</Label>
              <div className="grid grid-cols-2 gap-2">
                {PRODUCER_CATEGORIES.map((category) => (
                  <label
                    key={category.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.value)}
                      onChange={() => toggleCategory(category.value)}
                      className="h-4 w-4 rounded border border-gray-300"
                    />
                    <span className="text-sm">{category.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickup_location">Lieu de retrait</Label>
              <Input
                id="pickup_location"
                name="pickup_location"
                maxLength={200}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="delivers"
                name="delivers"
                type="checkbox"
                className="h-4 w-4 rounded border border-gray-300"
              />
              <label htmlFor="delivers" className="text-sm font-medium">
                Livraison possible
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_phone">Téléphone</Label>
              <Input
                id="contact_phone"
                name="contact_phone"
                type="tel"
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email">Email</Label>
              <Input
                id="contact_email"
                name="contact_email"
                type="email"
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule">Horaires</Label>
              <Input
                id="schedule"
                name="schedule"
                maxLength={300}
                placeholder="ex: Samedi 9h-12h, sur rendez-vous"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Création..." : "Créer la fiche"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
