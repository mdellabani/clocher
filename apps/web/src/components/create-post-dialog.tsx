"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { POST_TYPE_LABELS } from "@rural-community-platform/shared";
import type { PostType } from "@rural-community-platform/shared";
import { createPostAction } from "@/app/app/feed/actions";

const POST_TYPES_FOR_RESIDENTS: PostType[] = [
  "evenement",
  "entraide",
  "discussion",
];
const ALL_POST_TYPES: PostType[] = [
  "annonce",
  "evenement",
  "entraide",
  "discussion",
];

export function CreatePostDialog({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<PostType>("discussion");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const availableTypes = isAdmin ? ALL_POST_TYPES : POST_TYPES_FOR_RESIDENTS;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("type", type);
    const result = await createPostAction(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
