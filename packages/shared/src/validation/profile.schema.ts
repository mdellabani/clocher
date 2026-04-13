import { z } from "zod";

export const updateProfileSchema = z.object({
  display_name: z.string().min(2, "Le nom est trop court").max(100, "Le nom est trop long"),
  avatar_url: z.string().url().nullable().optional(),
});

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

export const signupSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  display_name: z.string().min(2, "Le nom est trop court").max(100, "Le nom est trop long"),
  commune_id: z.string().uuid("Commune invalide"),
});

export type SignupFormData = z.infer<typeof signupSchema>;
