import nodemailer from "nodemailer";
import path from "path";
import { env } from "../config/env.js";
import { getInvoiceFilePath } from "./invoiceService.js";

let transporter = null;

if (env.EMAIL_ENABLED && env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

export async function sendOrderConfirmationEmail(order) {
  if (!order.customerEmail) return;

  if (!env.EMAIL_ENABLED || !transporter) {
    console.log(`[SIMULATION EMAIL] Confirmation pour la commande ${order.orderNumber} envoyée à : ${order.customerEmail}`);
    console.log(`[SIMULATION EMAIL] Facture attachée : ${order.invoice?.pdfPath || "Non générée"}`);
    return { simulated: true, to: order.customerEmail };
  }

  const attachments = [];
  if (order.invoice?.pdfPath) {
    const invoicePath = getInvoiceFilePath(order.invoice.pdfPath);
    attachments.push({
      filename: `Facture_${order.orderNumber}.pdf`,
      path: invoicePath,
    });
  }

  const itemsList = order.items
    .map(
      (item) =>
        `<li><strong>${item.productName}</strong> x${item.quantity} - ${(
          item.unitPrice * item.quantity
        ).toLocaleString("fr-FR")} FCFA</li>`,
    )
    .join("");

  const mailOptions = {
    from: env.SMTP_FROM,
    to: order.customerEmail,
    subject: `Confirmation de votre commande PopCorn #${order.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h1 style="color: #E50914;">Merci pour votre commande chez PopCorn !</h1>
        <p>Bonjour <strong>${order.customerName}</strong>,</p>
        <p>Votre commande a été enregistrée avec succès sous la référence : <strong>${order.orderNumber}</strong>.</p>
        
        <h3>Récapitulatif de vos délices :</h3>
        <ul>${itemsList}</ul>

        <p><strong>Total de la commande :</strong> ${order.total.toLocaleString("fr-FR")} FCFA</p>
        <p><strong>Adresse de livraison :</strong> ${order.address}, ${order.city}</p>
        
        <p>Vous trouverez votre facture officielle au format PDF en pièce jointe.</p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777;">L'équipe PopCorn | Cotonou, Bénin</p>
      </div>
    `,
    attachments,
  };

  return transporter.sendMail(mailOptions);
}

export async function sendContactNotificationEmail(messageData) {
  if (!env.EMAIL_ENABLED || !transporter) {
    console.log(`[SIMULATION EMAIL] Nouveau message de contact reçu de ${messageData.name} (${messageData.email}) : "${messageData.subject}"`);
    return { simulated: true };
  }

  const mailOptions = {
    from: env.SMTP_FROM,
    to: env.OFFICIAL_CONTACT_EMAIL,
    replyTo: messageData.email,
    subject: `[PopCorn Contact] ${messageData.subject} - ${messageData.name}`,
    html: `
      <h3>Nouveau message reçu depuis le site PopCorn</h3>
      <p><strong>Nom :</strong> ${messageData.name}</p>
      <p><strong>Email :</strong> ${messageData.email}</p>
      <p><strong>Téléphone :</strong> ${messageData.phone || "Non renseigné"}</p>
      <p><strong>Sujet :</strong> ${messageData.subject}</p>
      <p><strong>Message :</strong></p>
      <blockquote style="background: #f9f9f9; padding: 12px; border-left: 4px solid #E50914;">
        ${messageData.message.replace(/\n/g, "<br>")}
      </blockquote>
    `,
  };

  return transporter.sendMail(mailOptions);
}
