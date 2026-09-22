import { prisma } from "../config/db.js";

/**
 * Architecture de paiement prête pour FedaPay / KKiaPay
 * Aucun service externe avec clé API n'est branché sans autorisation.
 */
export const PaymentStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
};

export const PaymentMethods = {
  CASH_ON_DELIVERY: "CASH_ON_DELIVERY",
  MOBILE_MONEY: "MOBILE_MONEY",
  CARD: "CARD",
  WHATSAPP: "WHATSAPP",
};

export async function processPaymentStatusUpdate(orderId, newStatus, paymentRef = null) {
  return prisma.order.update({
    where: { id: Number(orderId) },
    data: {
      paymentStatus: newStatus,
      paymentRef: paymentRef || undefined,
      ...(newStatus === PaymentStatus.PAID ? { status: "CONFIRMED" } : {}),
    },
  });
}
