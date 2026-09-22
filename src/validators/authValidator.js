import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse e-mail invalide"),
  phone: z.string().min(6, "Numéro de téléphone invalide"),
  password: z.string().min(6, "Le mot de passe doit comporter au moins 6 caractères"),
});

export const loginSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  password: z.string().min(1, "Le mot de passe est obligatoire"),
});
