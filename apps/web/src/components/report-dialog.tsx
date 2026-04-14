"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Flag } from "lucide-react";
import { REPORT_CATEGORIES } from "@rural-community-platform/shared";
import type { ReportCategory } from "@rural-community-platform/shared";
import { reportPostAction } from "@/app/app/posts/[id]/report-action";

export function ReportDialog({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    if (!category) {
      setError("Veuillez sélectionner une catégorie");
      return;
    }

    if (category === "autre" && !reason.trim()) {
      setError("Veuillez spécifier la raison pour 'Autre'");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await reportPostAction(
      postId,
      category,
      reason.trim() || null
    );

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    setTimeout(() => {
      setOpen(false);
      setCategory(null);
      setReason("");
      setSuccess(false);
    }, 2000);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] transition-colors hover:text-red-500"
          title="Signaler"
          type="button"
        >
          <Flag size={12} />
          Signaler
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Signaler cette publication</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <p className="text-sm text-green-600 font-medium">
              Merci, votre signalement a été pris en compte.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {REPORT_CATEGORIES.map((cat) => (
                <label
                  key={cat.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                    category === cat.value
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={cat.value}
                    checked={category === cat.value}
                    onChange={(e) => setCategory(e.target.value as ReportCategory)}
                    className="w-4 h-4"
                  />
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </label>
              ))}
            </div>

            {category === "autre" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  Détails (obligatoire)
                </label>
                <Textarea
                  placeholder="Expliquez pourquoi vous signalez cette publication..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-24"
                />
              </div>
            )}

            {category && category !== "autre" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  Détails (optionnel)
                </label>
                <Textarea
                  placeholder="Ajoutez des précisions..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-20"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!category || loading}
                className="bg-red-600 hover:bg-red-700"
              >
                {loading ? "Envoi..." : "Signaler"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
