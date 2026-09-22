import { env } from "../config/env.js";

export function buildWhatsAppOrderUrl(order) {
  const number = env.OFFICIAL_WHATSAPP_NUMBER || "2290161655462";

  const productsMessage = order.items
    .map(
      (item) =>
        `- ${item.productName} x${item.quantity} : ${(
          item.unitPrice * item.quantity
        ).toLocaleString("fr-FR")} FCFA`,
    )
    .join("\n");

  const messageLines = [
    ` *NOUVELLE COMMANDE POPCORN* : ${order.orderNumber}`,
    "",
    ` *Client* : ${order.customerName}`,
    ` *Téléphone* : ${order.customerPhone}`,
    ` *Ville* : ${order.city}`,
    ` *Adresse* : ${order.address}`,
    order.note ? `📝 *Note* : ${order.note}` : "",
    "",
    "*Détail des produits :*",
    productsMessage,
    "",
    `*Total à payer* : ${order.total.toLocaleString("fr-FR")} FCFA`,
    ` *Mode de règlement* : ${order.paymentMethod}`,
    "",
    "Merci de me confirmer la préparation et l'heure de livraison !",
  ];

  const fullMessage = messageLines.filter(Boolean).join("\n");
  const encoded = encodeURIComponent(fullMessage);

  return `https://wa.me/${number}?text=${encoded}`;
}
