import { z } from "zod";

export const createPostSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(200, "Le titre est trop long"),
  body: z.string().min(1, "Le contenu est requis").max(5000, "Le contenu est trop long"),
  type: z.enum(["annonce", "evenement", "entraide", "discussion"]),
  event_date: z.string().min(1).nullable().optional(),
  event_location: z.string().max(200).nullable().optional(),
  epci_visible: z.boolean().default(false),
});

export type CreatePostFormData = z.infer<typeof createPostSchema>;

export const createCommentSchema = z.object({
  body: z.string().min(1, "Le commentaire est requis").max(2000, "Le commentaire est trop long"),
});

export type CreateCommentFormData = z.infer<typeof createCommentSchema>;
