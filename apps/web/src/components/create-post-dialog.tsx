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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { POST_TYPE_LABELS } from "@pretou/shared";
import type { PostType } from "@pretou/shared";
import { createPostAction } from "@/app/app/feed/actions";
import { PollForm } from "@/components/poll-form";
import type { PollFormData } from "@/components/poll-form";

const POST_TYPES_FOR_RESIDENTS: PostType[] = [
  "evenement",
  "entraide",
  "discussion",
  "service",
];
const ALL_POST_TYPES: PostType[] = [
  "annonce",
  "evenement",
  "entraide",
  "discussion",
  "service",
];

export function CreatePostDialog({ isAdmin, communeId }: { isAdmin: boolean; communeId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<PostType>("discussion");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [includePoll, setIncludePoll] = useState(false);
  const [pollData, setPollData] = useState<PollFormData | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const availableTypes = isAdmin ? ALL_POST_TYPES : POST_TYPES_FOR_RESIDENTS;

  async function resizeImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxWidth = 800;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
          }

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const resizedFile = new File([blob], file.name, { type: "image/webp" });
                resolve(resizedFile);
              } else {
                resolve(file);
              }
            },
            "image/webp",
            0.85
          );
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("type", type);
    if (includePoll && pollData) {
      formData.set("poll_data", JSON.stringify(pollData));
    }

    // Resize and add image if selected
    if (imageFile && imageFile.size > 0) {
      const resizedFile = await resizeImage(imageFile);
      formData.set("image", resizedFile);
    }

    const result = await createPostAction(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setOpen(false);
    setImageFile(null);
    setImagePreview(null);
    setLoading(false);
    await qc.invalidateQueries({ queryKey: ["posts", communeId] });
    await qc.invalidateQueries({ queryKey: queryKeys.posts.pinned(communeId) });
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        setImageFile(null);
        setImagePreview(null);
      }
    }}>
      <DialogTrigger asChild>
        <Button>Nouvelle publication</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Creer une publication</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as PostType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {POST_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input id="title" name="title" required maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Contenu</Label>
            <Textarea
              id="body"
              name="body"
              required
              maxLength={5000}
              rows={5}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="include-poll"
              type="checkbox"
              checked={includePoll}
              onChange={(e) => {
                setIncludePoll(e.target.checked);
                if (!e.target.checked) setPollData(null);
              }}
              className="h-4 w-4 rounded border border-gray-300"
            />
            <label htmlFor="include-poll" className="text-sm font-medium">
              Ajouter un sondage
            </label>
          </div>
          {includePoll && (
            <PollForm onPollChange={setPollData} />
          )}
          {type === "evenement" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="event_date">Date de l evenement</Label>
                <Input
                  id="event_date"
                  name="event_date"
                  type="datetime-local"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event_location">Lieu</Label>
                <Input
                  id="event_location"
                  name="event_location"
                  maxLength={200}
                />
              </div>
            </>
          )}
          {type === "service" && (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
              Les annonces de service expirent automatiquement après 7 jours.
            </p>
          )}

          {/* Image upload */}
          <div className="space-y-2">
            <Label>Photo (optionnel)</Label>
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-32 w-full rounded-lg object-cover"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2 bg-black/50 text-white hover:bg-black/70"
                  onClick={removeImage}
                >
                  ✕
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-6 py-8 text-center hover:border-gray-400">
                <svg
                  className="h-8 w-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="text-sm text-gray-600">
                  Cliquez pour ajouter une photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </label>
            )}
          </div>

          <input type="hidden" name="epci_visible" value="false" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Publication..." : "Publier"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
