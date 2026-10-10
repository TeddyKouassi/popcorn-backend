import crypto from "crypto";
import { env } from "../config/env.js";

/**
 * Adaptateur SasPay. Les chemins et le format de la charge utile ci-dessous
 * proviennent du brouillon récupéré; ils ne sont activables qu'après validation
 * explicite avec la documentation du compte marchand SasPay.
 */

/**
 * Formate un numéro de téléphone au standard international (par défaut indicatif Bénin +229)
 * @param {string} phone
 * @returns {string}
 */
export function formatPhoneNumber(phone) {
  if (!phone) return "";
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("00")) return `+${cleaned.slice(2)}`;
  if (cleaned.startsWith("229")) return `+${cleaned}`;
  // Si numéro local sans indicatif (8 ou 10 chiffres pour le Bénin)
  return `+229${cleaned}`;
}

function resolveReturnUrl(candidate, fallback) {
  if (!candidate) return fallback;

  try {
    const candidateUrl = new URL(candidate);
    const clientUrl = new URL(env.CLIENT_URL);
    if (candidateUrl.origin === clientUrl.origin) return candidateUrl.toString();
  } catch {
    // Use the server-controlled fallback below.
  }

  return fallback;
}

/**
 * Prépare les en-têtes HTTP pour les requêtes vers l'API SasPay
 * @param {string} [idempotencyKey]
 * @returns {Record<string, string>}
 */
function getHeaders(idempotencyKey = null) {
  if (!env.SASPAY_SECRET_KEY) {
    throw new Error(
      "La clé secrète SasPay (SASPAY_SECRET_KEY) n'est pas configurée dans l'environnement backend.",
    );
  }

  const headers = {
    Authorization: `Bearer ${env.SASPAY_SECRET_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  return headers;
}

function assertSasPayConfiguration() {
  if (!env.SASPAY_ENABLED) {
    const error = new Error("La passerelle SasPay est désactivée.");
    error.statusCode = 503;
    throw error;
  }

  if (!env.SASPAY_API_CONTRACT_CONFIRMED || !env.SASPAY_BASE_URL) {
    const error = new Error(
      "La configuration SasPay n'est pas activable avant confirmation du contrat API officiel (URL, endpoints, authentification et format webhook).",
    );
    error.statusCode = 503;
    throw error;
  }
}

/**
 * Initialise une session de paiement SasPay Checkout pour une commande PopCorn
 * Endpoint SasPay : POST /checkout-sessions/
 *
 * @param {object} params
 * @param {object} params.order - Objet Commande Prisma
 * @param {string} [params.returnUrl] - URL de redirection après succès
 * @param {string} [params.cancelUrl] - URL de redirection en cas d'abandon
 * @param {string} [params.network] - Moyen de paiement spécifique éventuel (MTN, MOOV, CELTIIS, CARD)
 * @returns {Promise<{ checkoutUrl: string, sessionId: string, raw: object }>}
 */
export async function createCheckoutSession({
  order,
  returnUrl,
  cancelUrl,
  network,
}) {
  if (!order || !Number.isInteger(Number(order.id)) || !Number.isSafeInteger(Number(order.total)) || Number(order.total) <= 0 || !order.orderNumber) {
    throw new Error("Les données de la commande sont incomplètes pour initier le paiement.");
  }

  assertSasPayConfiguration();

  // Décomposition du nom du client
  const nameParts = (order.customerName || "Client PopCorn").trim().split(" ");
  const firstName = nameParts[0] || "Client";
  const lastName = nameParts.slice(1).join(" ") || "PopCorn";
  const formattedPhone = formatPhoneNumber(order.customerPhone);

  const defaultSuccessUrl = `${env.CLIENT_URL}/confirmation?orderNumber=${encodeURIComponent(order.orderNumber)}&payment=saspay`;
  const defaultCancelUrl = `${env.CLIENT_URL}/panier?cancelledOrder=${encodeURIComponent(order.orderNumber)}`;

  const payload = {
    // Montant au format chaîne décimale ex: "3500.00"
    amount: Number(order.total).toFixed(2),
    currency: "XOF",
    country: "BJ",
    description: `Paiement commande PopCorn ${order.orderNumber}`,
    customer: {
      first_name: firstName,
      last_name: lastName,
      email: order.customerEmail || undefined,
      phone: formattedPhone || undefined,
    },
    // Avoid turning this endpoint into an open redirect through caller input.
    success_url: resolveReturnUrl(returnUrl, defaultSuccessUrl),
    cancel_url: resolveReturnUrl(cancelUrl, defaultCancelUrl),
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      platform: "PopCorn Web",
      ...(network ? { preferredNetwork: network } : {}),
    },
  };

  // Stable par commande : une reprise réseau ne doit pas créer plusieurs paiements.
  const idempotencyKey = `popcorn-order-${order.id}`;
  const url = `${env.SASPAY_BASE_URL.replace(/\/+$/, "")}/checkout-sessions/`;

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: getHeaders(idempotencyKey),
      body: JSON.stringify(payload),
    });
  } catch (networkError) {
    throw new Error(
      `Impossible de joindre le serveur SasPay : ${networkError.message}`,
    );
  }

  const responseData = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage =
      responseData?.message ||
      responseData?.detail ||
      responseData?.error ||
      `Erreur SasPay (statut HTTP ${response.status})`;
    throw new Error(`Échec de création de la session SasPay : ${errorMessage}`);
  }

  const checkoutUrl =
    responseData?.checkout_url ||
    responseData?.url ||
    responseData?.data?.checkout_url;
  const sessionId =
    responseData?.id ||
    responseData?.session_id ||
    responseData?.data?.id;

  if (!checkoutUrl) {
    throw new Error(
      "L'API SasPay n'a pas retourné d'URL de redirection (checkout_url).",
    );
  }

  return {
    checkoutUrl,
    sessionId: String(sessionId || ""),
    raw: responseData,
  };
}

/**
 * Récupère les détails d'une session de checkout SasPay
 * Endpoint SasPay : GET /checkout-sessions/{sessionId}/
 *
 * @param {string} sessionId
 * @returns {Promise<object>}
 */
export async function getCheckoutSession(sessionId) {
  if (!sessionId) {
    throw new Error("L'identifiant de la session de paiement est requis.");
  }

  assertSasPayConfiguration();
  const url = `${env.SASPAY_BASE_URL.replace(/\/+$/, "")}/checkout-sessions/${encodeURIComponent(sessionId)}/`;

  let response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: getHeaders(),
    });
  } catch (networkError) {
    throw new Error(
      `Impossible de joindre le serveur SasPay : ${networkError.message}`,
    );
  }

  const responseData = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg =
      responseData?.message ||
      responseData?.detail ||
      `Erreur SasPay (HTTP ${response.status})`;
    throw new Error(`Vérification de session SasPay échouée : ${errorMsg}`);
  }

  return responseData;
}

/**
 * Vérifie l'état d'un paiement auprès de SasPay
 * Endpoint SasPay : GET /payments/{paymentId}/verify/
 *
 * @param {string} paymentId
 * @returns {Promise<object>}
 */
export async function verifyPayment(paymentId) {
  if (!paymentId) {
    throw new Error("L'identifiant de paiement SasPay est requis.");
  }

  assertSasPayConfiguration();
  const url = `${env.SASPAY_BASE_URL.replace(/\/+$/, "")}/payments/${encodeURIComponent(paymentId)}/verify/`;

  let response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: getHeaders(),
    });
  } catch (networkError) {
    throw new Error(
      `Impossible de joindre le serveur SasPay : ${networkError.message}`,
    );
  }

  const responseData = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg =
      responseData?.message ||
      responseData?.detail ||
      `Erreur SasPay (HTTP ${response.status})`;
    throw new Error(`Vérification du paiement SasPay échouée : ${errorMsg}`);
  }

  return responseData;
}

/**
 * Valide la signature cryptographique d'un Webhook IPN SasPay
 * This HMAC format has not been verified against public SasPay documentation.
 * It is intentionally opt-in through SASPAY_WEBHOOK_VERIFICATION_MODE and must
 * only be enabled if SasPay confirms exactly this format for the merchant.
 * Expected format when enabled:
 * - En-tête signature : X-Webhook-Signature
 * - En-tête horodatage : X-Webhook-Timestamp (secondes Unix)
 * - Chaîne signée : `${timestamp}.${rawBody}`
 * - Algorithme : HMAC-SHA256, hexadécimal minuscules
 * - Fenêtre anti-rejeu : 300 secondes
 *
 * @param {object} params
 * @param {string} params.signatureHeader - Valeur de X-Webhook-Signature
 * @param {string|number} params.timestampHeader - Valeur de X-Webhook-Timestamp
 * @param {Buffer|string} params.rawBody - Corps brut de la requête HTTP
 * @param {string} [params.secret] - Clé secrète de webhook (défaut : env.SASPAY_WEBHOOK_SECRET)
 * @returns {{ isValid: boolean, reason?: string }}
 */
export function verifyWebhookSignature({
  signatureHeader,
  timestampHeader,
  rawBody,
  secret = env.SASPAY_WEBHOOK_SECRET,
}) {
  if (!secret) {
    return {
      isValid: false,
      reason: "Le secret de signature webhook (SASPAY_WEBHOOK_SECRET) n'est pas configuré.",
    };
  }

  if (!signatureHeader || !timestampHeader) {
    return {
      isValid: false,
      reason: "En-têtes de signature ou d'horodatage SasPay manquants.",
    };
  }

  if (!rawBody) {
    return {
      isValid: false,
      reason: "Corps brut (rawBody) de la requête manquant pour le calcul HMAC.",
    };
  }

  // 1. Contrôle anti-rejeu (tolérance de 300 secondes = 5 minutes)
  const timestampNum = parseInt(timestampHeader, 10);
  if (isNaN(timestampNum)) {
    return { isValid: false, reason: "Horodatage webhook invalide." };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestampNum) > 300) {
    return {
      isValid: false,
      reason: `Horodatage expiré ou horloge décalée (écart > 300s). Reçu: ${timestampNum}, Actuel: ${nowSec}.`,
    };
  }

  // 2. Calcul du HMAC-SHA256
  const rawString = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody);
  const payloadToSign = `${timestampNum}.${rawString}`;

  const computedHmac = crypto
    .createHmac("sha256", secret)
    .update(payloadToSign)
    .digest("hex")
    .toLowerCase();

  const receivedSignature = String(signatureHeader).trim().toLowerCase();

  // 3. Comparaison sécurisée contre les attaques temporelles (timing attacks)
  if (computedHmac.length !== receivedSignature.length) {
    return { isValid: false, reason: "Longueur de signature invalide." };
  }

  const isValid = crypto.timingSafeEqual(
    Buffer.from(computedHmac, "utf8"),
    Buffer.from(receivedSignature, "utf8"),
  );

  if (!isValid) {
    return { isValid: false, reason: "Signature HMAC SasPay non concordante." };
  }

  return { isValid: true };
}

