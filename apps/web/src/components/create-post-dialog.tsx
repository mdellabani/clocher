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

export function CreatePostDialog({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<PostType>("discussion");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [includePoll, setIncludePoll] = useState(false);
  const [pollData, setPollData] = useState<PollFormData | null>(null);

  const availableTypes = isAdmin ? ALL_POST_TYPES : POST_TYPES_FOR_RESIDENTS;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("type", type);
    if (includePoll && pollData) {
      formData.set("poll_data", JSON.stringify(pollData));
    }
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
