import { env } from "../config/env.js";
import crypto from "crypto";
import { prisma } from "../config/db.js";
import * as saspayService from "../services/saspayService.js";
import * as paymentService from "../services/paymentService.js";

function hasPaymentAccess(order, req) {
  if (order.userId !== null) {
    return Boolean(req.user && (req.user.role === "ADMIN" || req.user.id === order.userId));
  }

  const token = req.get("X-Payment-Access-Token");
  if (!token || !order.paymentAccessTokenHash) return false;
  const actual = crypto.createHash("sha256").update(token).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(actual, "utf8"),
    Buffer.from(order.paymentAccessTokenHash, "utf8"),
  );
}

/**
 * Contrôleur de gestion des paiements SasPay
 */

/**
 * Initialise une session de paiement SasPay Checkout pour une commande
 * POST /api/payments/saspay/initialize/:orderId
 */
export async function initializeSasPaySession(req, res, next) {
  try {
    const { orderId } = req.params;
    const { returnUrl, cancelUrl, network } = req.body;

    if (!env.SASPAY_ENABLED) {
      return res.status(503).json({
        success: false,
        message: "La passerelle de paiement SasPay est actuellement désactivée.",
      });
    }

    if (!env.SASPAY_SECRET_KEY) {
      return res.status(503).json({
        success: false,
        message: "La passerelle SasPay n'est pas configurée (clé secrète manquante).",
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Commande #${orderId} introuvable.`,
      });
    }

    // Contrôle d'accès : seul le propriétaire de la commande ou un admin peut initier le paiement
    if (!hasPaymentAccess(order, req)) {
      return res.status(403).json({
        success: false,
        message: "Accès refusé à cette commande.",
      });
    }

    if (order.paymentMethod !== "SASPAY") {
      return res.status(400).json({
        success: false,
        message: "Cette commande n'a pas été créée pour un paiement SasPay.",
      });
    }

    if (order.paymentStatus === paymentService.PaymentStatus.PAID) {
      return res.status(400).json({
        success: false,
        message: "Cette commande a déjà été payée.",
      });
    }

    // Création de la session auprès de SasPay
    const session = await saspayService.createCheckoutSession({
      order,
      returnUrl,
      cancelUrl,
      network,
    });

    // Enregistrement de la référence de session et de la méthode de paiement
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentMethod: "SASPAY",
        paymentRef: session.sessionId || order.paymentRef,
      },
    });

    res.status(200).json({
      success: true,
      message: "Session de paiement SasPay initialisée avec succès.",
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        checkoutUrl: session.checkoutUrl,
        sessionId: session.sessionId,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Vérifie le statut réel d'un paiement auprès de SasPay
 * GET /api/payments/saspay/verify/:orderId
 */
export async function verifySasPayPayment(req, res, next) {
  try {
    const { orderId } = req.params;
    const { sessionId, paymentId } = req.query;

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: { items: true, invoice: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Commande #${orderId} introuvable.`,
      });
    }

    // Contrôle d'accès pour les utilisateurs connectés
    if (!hasPaymentAccess(order, req)) {
      return res.status(403).json({
        success: false,
        message: "Accès non autorisé à cette commande.",
      });
    }

    if (order.paymentMethod !== "SASPAY") {
      return res.status(400).json({
        success: false,
        message: "Cette commande n'a pas été créée pour un paiement SasPay.",
      });
    }

    // Si déjà marquée payée dans notre base
    if (order.paymentStatus === paymentService.PaymentStatus.PAID) {
      return res.status(200).json({
        success: true,
        message: "Le paiement a déjà été confirmé.",
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          status: order.status,
          paymentRef: order.paymentRef,
        },
      });
    }

    // The browser must not be allowed to replace the reference associated with
    // the order. Redirect query parameters are only useful when they agree
    // with the server-side value.
    const requestedRef = paymentId || sessionId;
    if (requestedRef && requestedRef !== order.paymentRef) {
      return res.status(400).json({
        success: false,
        message: "Référence SasPay non associée à cette commande.",
      });
    }

    const refToVerify = order.paymentRef;
    if (!refToVerify) {
      return res.status(400).json({
        success: false,
        message: "Aucune référence de transaction ou de session SasPay associée à cette commande.",
      });
    }

    // Si SasPay n'est pas activé ou clé absente (environnement de dev sans compte)
    if (!env.SASPAY_SECRET_KEY) {
      return res.status(503).json({
        success: false,
        message: "Passerelle SasPay non configurée côté serveur.",
      });
    }

    // Interrogation de l'API SasPay
    let verificationData;
    if (paymentId || refToVerify.startsWith("pay_")) {
      verificationData = await saspayService.verifyPayment(refToVerify);
    } else {
      verificationData = await saspayService.getCheckoutSession(refToVerify);
    }

    const transactionStatus = String(
      verificationData?.status ||
      verificationData?.data?.status ||
      "",
    ).toUpperCase();

    // Vérification du montant pour parer aux fraudes
    const rawAmount =
      verificationData?.amount ||
      verificationData?.data?.amount ||
      0;
    const reportedAmount = Math.round(Number(rawAmount));
    const reportedCurrency = String(
      verificationData?.currency || verificationData?.data?.currency || "",
    ).toUpperCase();
    const metadata = verificationData?.metadata || verificationData?.data?.metadata || {};
    const matchesOrder =
      String(metadata.orderId || metadata.order_id || "") === String(order.id) &&
      String(metadata.orderNumber || metadata.order_number || "") === order.orderNumber;

    const isSuccess =
      transactionStatus === "SUCCESS" ||
      transactionStatus === "PAID" ||
      transactionStatus === "COMPLETED";

    const isFailed =
      transactionStatus === "FAILED" ||
      transactionStatus === "CANCELLED" ||
      transactionStatus === "EXPIRED";

    if (isSuccess) {
      // A redirect never confirms a payment: all three values must come from
      // SasPay's server response and match the server-side order.
      if (!matchesOrder || reportedCurrency !== "XOF" || reportedAmount !== order.total) {
        return res.status(400).json({
          success: false,
          message: "La réponse SasPay ne correspond pas à la commande, à la devise ou au montant attendu.",
        });
      }

      const updatedOrder = await paymentService.markOrderAsPaid(order.id, refToVerify);
      return res.status(200).json({
        success: true,
        message: "Paiement validé avec succès par SasPay.",
        data: {
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          paymentStatus: updatedOrder.paymentStatus,
          status: updatedOrder.status,
        },
      });
    }

    if (isFailed) {
      const updatedOrder = await paymentService.handleFailedOrCancelledPayment(
        order.id,
        `Statut SasPay: ${transactionStatus}`,
      );
      return res.status(200).json({
        success: false,
        message: "Le paiement SasPay a échoué ou a été annulé. Les stocks ont été restitués.",
        data: {
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          paymentStatus: updatedOrder.paymentStatus,
          status: updatedOrder.status,
        },
      });
    }

    // Statut en cours (PENDING)
    res.status(200).json({
      success: true,
      message: "Paiement en cours de traitement par SasPay.",
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: paymentService.PaymentStatus.PENDING,
        status: order.status,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Traitement sécurisé des notifications de paiement (Webhooks IPN SasPay)
 * POST /api/payments/saspay/webhook
 */
export async function handleSasPayWebhook(req, res) {
  try {
    if (env.SASPAY_WEBHOOK_VERIFICATION_MODE !== "hmac-sha256-timestamped") {
      return res.status(503).json({
        received: false,
        error: "La vérification de webhook SasPay n'est pas configurée avec un format confirmé.",
      });
    }

    const signature =
      req.headers["x-webhook-signature"] ||
      req.headers["X-Webhook-Signature"];
    const timestamp =
      req.headers["x-webhook-timestamp"] ||
      req.headers["X-Webhook-Timestamp"];
    const eventType =
      req.headers["x-webhook-event"] ||
      req.headers["X-Webhook-Event"] ||
      req.body?.event;

    // 1. Validation cryptographique de la signature HMAC
    const validation = saspayService.verifyWebhookSignature({
      signatureHeader: signature,
      timestampHeader: timestamp,
      rawBody: req.rawBody,
    });

    if (!validation.isValid) {
      console.warn("⚠️ Rejet webhook SasPay :", validation.reason);
      return res.status(400).json({
        received: false,
        error: validation.reason,
      });
    }

    const payload = req.body || {};
    const transactionData = payload.data || payload;
    const metadata = transactionData.metadata || {};

    const orderId =
      metadata.orderId ||
      metadata.order_id ||
      payload.orderId;
    const orderNumber =
      metadata.orderNumber ||
      metadata.order_number;

    if (!orderId && !orderNumber) {
      console.warn("⚠️ Webhook SasPay reçu sans identifiant de commande dans les métadonnées.");
      return res.status(200).json({ received: true, note: "Commande non identifiée" });
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          ...(orderId ? [{ id: Number(orderId) }] : []),
          ...(orderNumber ? [{ orderNumber: String(orderNumber) }] : []),
        ],
      },
    });

    if (!order) {
      console.warn(`⚠️ Webhook SasPay : Commande non trouvée (ID: ${orderId}, Num: ${orderNumber}).`);
      return res.status(200).json({ received: true, note: "Commande introuvable" });
    }

    const normalizedEvent = String(eventType || "").toLowerCase();
    const transactionId =
      transactionData.id ||
      transactionData.payment_id ||
      transactionData.transaction_id ||
      "SASPAY-WEBHOOK";

    if (
      normalizedEvent === "transaction.success" ||
      normalizedEvent === "payment.succeeded" ||
      normalizedEvent === "checkout_session.completed"
    ) {
      const amount = Math.round(Number(transactionData.amount));
      const currency = String(transactionData.currency || "").toUpperCase();
      const metadataMatchesOrder =
        String(metadata.orderId || metadata.order_id || "") === String(order.id) &&
        String(metadata.orderNumber || metadata.order_number || "") === order.orderNumber;
      if (!metadataMatchesOrder || currency !== "XOF" || amount !== order.total) {
        console.error(
          `⚠️ Webhook SasPay incohérent pour la commande ${order.orderNumber}.`,
        );
        return res.status(400).json({ error: "Commande, devise ou montant non concordant" });
      }

      await paymentService.markOrderAsPaid(order.id, String(transactionId));
      console.log(`✅ Commande #${order.id} (${order.orderNumber}) confirmée payée via Webhook SasPay.`);
    } else if (
      normalizedEvent === "transaction.failed" ||
      normalizedEvent === "transaction.cancelled" ||
      normalizedEvent === "payment.failed"
    ) {
      await paymentService.handleFailedOrCancelledPayment(
        order.id,
        `Webhook: ${normalizedEvent}`,
      );
      console.log(`❌ Commande #${order.id} marquée échouée/annulée via Webhook SasPay, stocks restitués.`);
    }

    // Accusé de réception 200 standard pour SasPay
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("⚠️ Erreur lors du traitement du webhook SasPay :", error);
    res.status(500).json({ received: false, error: error.message });
  }
}

