import { z } from "zod";

export const contactMessageSchema = z.object({
  name: z.string().min(2, "Le nom est obligatoire"),
  email: z.string().email("Adresse e-mail invalide"),
  phone: z.string().optional().nullable(),
  subject: z.string().min(2, "Le sujet est obligatoire"),
  message: z.string().min(5, "Le message doit comporter au moins 5 caractères"),
});
