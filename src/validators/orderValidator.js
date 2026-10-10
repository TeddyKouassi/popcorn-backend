import { z } from "zod";

export const createOrderSchema = z.object({
  name: z.string().min(2, "Le nom complet est obligatoire"),
  phone: z.string().min(6, "Le numéro de téléphone est obligatoire"),
  email: z.string().email("Adresse e-mail invalide").optional().or(z.literal("")),
  city: z.string().min(2, "La ville de livraison est obligatoire"),
  address: z.string().min(3, "L'adresse précise est obligatoire"),
  note: z.string().max(500, "La note ne peut pas dépasser 500 caractères").optional().nullable(),
  paymentMethod: z
    .enum(["CASH_ON_DELIVERY", "SASPAY", "MOBILE_MONEY", "CARD", "WHATSAPP"])
    .default("CASH_ON_DELIVERY"),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive("ID de produit invalide"),
        quantity: z.number().int().positive("La quantité doit être supérieure à 0"),
      }),
    )
    .min(1, "Le panier ne peut pas être vide"),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "SHIPPING",
    "DELIVERED",
    "CANCELLED",
  ]),
  paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]).optional(),
});
