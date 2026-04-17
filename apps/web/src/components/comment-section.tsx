"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  addCommentAction,
  deleteCommentAction,
} from "@/app/app/posts/[id]/actions";
import { useComments } from "@/hooks/queries/use-comments";

interface CommentSectionProps {
  postId: string;
  currentUserId: string;
  isAdmin: boolean;
}

export function CommentSection({ postId, currentUserId, isAdmin }: CommentSectionProps) {
  const qc = useQueryClient();
  const { data: comments = [] } = useComments(postId);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addCommentAction(postId, body);
      if (result.error) {
        setError(result.error);
      } else {
        setBody("");
        qc.invalidateQueries({ queryKey: queryKeys.comments(postId) });
      }
    });
  }

  function handleDelete(commentId: string) {
    startTransition(async () => {
      const result = await deleteCommentAction(commentId, postId);
      if (!result.error) {
        qc.invalidateQueries({ queryKey: queryKeys.comments(postId) });
      }
    });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        Commentaires ({comments.length})
      </h2>

      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun commentaire pour le moment.
          </p>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">
                        {comment.profiles?.display_name ?? "Utilisateur"}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                    </div>
                    <p className="text-sm">{comment.body}</p>
                  </div>
                  {(comment.author_id === currentUserId || isAdmin) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(comment.id)}
                      disabled={isPending}
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Écrire un commentaire..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          disabled={isPending}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={isPending || body.trim().length === 0}>
          {isPending ? "Envoi..." : "Commenter"}
        </Button>
      </form>
    </div>
  );
}
