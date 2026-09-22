import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(2, "Le nom du produit est requis"),
  price: z.number().int().positive("Le prix doit être un entier positif en FCFA"),
  categoryId: z.number().int().positive("La catégorie est requise"),
  format: z.string().default("Grand format"),
  description: z.string().min(5, "La description doit comporter au moins 5 caractères"),
  image: z.string().min(1, "L'image du produit est requise"),
  badge: z.string().nullable().optional(),
  stock: z.number().int().nonnegative().default(50),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export const updateStockSchema = z.object({
  stock: z.number().int().nonnegative("Le stock ne peut pas être négatif"),
});
