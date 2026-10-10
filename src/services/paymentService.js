import { prisma } from "../config/db.js";

/**
 * Service central de gestion des statuts de paiement PopCorn
 * Compatible paiements en espèces (CASH_ON_DELIVERY) et passerelle SasPay.
 */
export const PaymentStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  CANCELLED: "CANCELLED",
};

export const PaymentMethods = {
  CASH_ON_DELIVERY: "CASH_ON_DELIVERY",
  SASPAY: "SASPAY",
  MOBILE_MONEY: "MOBILE_MONEY",
  CARD: "CARD",
  WHATSAPP: "WHATSAPP",
};

/**
 * Met à jour le statut d'un paiement de façon générique
 * @param {number|string} orderId
 * @param {string} newStatus
 * @param {string|null} paymentRef
 * @returns {Promise<object>}
 */
export async function processPaymentStatusUpdate(orderId, newStatus, paymentRef = null) {
  const updateData = {
    paymentStatus: newStatus,
    ...(paymentRef ? { paymentRef } : {}),
  };

  if (newStatus === PaymentStatus.PAID) {
    updateData.status = "CONFIRMED";
  }

  return prisma.order.update({
    where: { id: Number(orderId) },
    data: updateData,
    include: {
      items: true,
      invoice: true,
    },
  });
}

/**
 * Marque une commande comme payée avec succès
 * Opération idempotente : si la commande est déjà payée, aucune modification inutile.
 *
 * @param {number|string} orderId
 * @param {string} paymentRef - Référence de la transaction SasPay
 * @returns {Promise<object>}
 */
export async function markOrderAsPaid(orderId, paymentRef) {
  const numericId = Number(orderId);
  const existingOrder = await prisma.order.findUnique({
    where: { id: numericId },
    include: { items: true, invoice: true },
  });

  if (!existingOrder) {
    const error = new Error(`Commande #${orderId} introuvable pour la validation du paiement.`);
    error.statusCode = 404;
    throw error;
  }

  if (existingOrder.paymentStatus === PaymentStatus.PAID) {
    return existingOrder;
  }

  return prisma.order.update({
    where: { id: numericId },
    data: {
      paymentStatus: PaymentStatus.PAID,
      paymentRef: paymentRef || existingOrder.paymentRef,
      status: "CONFIRMED",
    },
    include: {
      items: true,
      invoice: true,
    },
  });
}

/**
 * Traite l'échec ou l'annulation d'un paiement en ligne
 * Restitue automatiquement les stocks des produits décrémentés lors de la création
 * Transaction atomique Prisma avec protection contre le double restockage.
 *
 * @param {number|string} orderId
 * @param {string} [reason] - Motif de l'échec ou annulation
 * @returns {Promise<object>}
 */
export async function handleFailedOrCancelledPayment(orderId, reason = "Paiement non abouti") {
  const numericId = Number(orderId);

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: numericId },
      include: { items: true },
    });

    if (!order) {
      const error = new Error(`Commande #${orderId} introuvable.`);
      error.statusCode = 404;
      throw error;
    }

    // Protection anti-double-restockage : si la commande était déjà annulée/échouée
    // A notification tardive d'échec ne doit jamais annuler, ni restocker, une
    // commande déjà confirmée payée.
    if (
      order.paymentStatus === PaymentStatus.PAID ||
      order.status === "CANCELLED" ||
      order.paymentStatus === PaymentStatus.FAILED
    ) {
      return order;
    }

    // Restitution des stocks pour chaque article de la commande
    for (const item of order.items) {
      if (item.productId && item.quantity > 0) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });
      }
    }

    // Mise à jour de la commande vers CANCELLED / FAILED
    const updatedOrder = await tx.order.update({
      where: { id: numericId },
      data: {
        paymentStatus: PaymentStatus.FAILED,
        status: "CANCELLED",
        note: order.note
          ? `${order.note} | Annulation paiement: ${reason}`
          : `Annulation paiement: ${reason}`,
      },
      include: {
        items: true,
        invoice: true,
      },
    });

    return updatedOrder;
  });
}
