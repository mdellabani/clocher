import { z } from "zod";

export const registerCommuneSchema = z.object({
  // Commune info
  commune_name: z.string().min(2, "Le nom de la commune est trop court").max(100),
  code_postal: z.string().regex(/^\d{5}$/, "Code postal invalide (5 chiffres)"),
  // Admin account
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  display_name: z.string().min(2, "Le nom est trop court").max(100),
  role_description: z.string().optional(), // e.g., "Secrétaire de mairie"
});

export type RegisterCommuneFormData = z.infer<typeof registerCommuneSchema>;
