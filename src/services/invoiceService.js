import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INVOICES_DIR = path.resolve(__dirname, "../../invoices");

if (!fs.existsSync(INVOICES_DIR)) {
  fs.mkdirSync(INVOICES_DIR, { recursive: true });
}

function formatPriceFCFA(amount) {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

export async function generateInvoicePdf(order) {
  const invoiceNumber = order.invoice?.invoiceNumber || `FAC-${order.id}`;
  const filename = `${invoiceNumber}.pdf`;
  const filePath = path.join(INVOICES_DIR, filename);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const writeStream = fs.createWriteStream(filePath);

      doc.pipe(writeStream);

      // --- EN-TÊTE ---
      doc
        .fillColor("#E50914")
        .fontSize(26)
        .font("Helvetica-Bold")
        .text("POPCORN", 50, 50);

      doc
        .fillColor("#555555")
        .fontSize(10)
        .font("Helvetica")
        .text("L'expérience gourmande & croustillante", 50, 80)
        .text("Cotonou, Bénin | Tél : +229 01 61 65 54 62", 50, 95)
        .text("Email : togbadjamaurel@gmail.com", 50, 110);

      doc
        .fillColor("#111111")
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("FACTURE", 400, 50, { align: "right" });

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#444444")
        .text(`N° Facture : ${invoiceNumber}`, 400, 75, { align: "right" })
        .text(`N° Commande : ${order.orderNumber}`, 400, 90, { align: "right" })
        .text(`Date : ${new Date(order.createdAt).toLocaleDateString("fr-FR")}`, 400, 105, { align: "right" });

      doc.moveTo(50, 135).lineTo(550, 135).strokeColor("#E2E8F0").lineWidth(1).stroke();

      // --- INFORMATIONS CLIENT ---
      const clientY = 150;
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#1A202C")
        .text("FACTURÉ À :", 50, clientY);

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#4A5568")
        .text(`Client : ${order.customerName}`, 50, clientY + 18)
        .text(`Téléphone : ${order.customerPhone}`, 50, clientY + 32)
        .text(`Email : ${order.customerEmail || "Non renseigné"}`, 50, clientY + 46)
        .text(`Livraison : ${order.address}, ${order.city}`, 50, clientY + 60);

      if (order.note) {
        doc.text(`Note : ${order.note}`, 50, clientY + 74);
      }

      // --- STATUT ET PAIEMENT ---
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#1A202C")
        .text("DÉTAILS DU PAIEMENT :", 340, clientY);

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#4A5568")
        .text(`Mode : ${order.paymentMethod}`, 340, clientY + 18)
        .text(`Statut paiement : ${order.paymentStatus}`, 340, clientY + 32)
        .text(`Statut commande : ${order.status}`, 340, clientY + 46);

      // --- TABLEAU DES ARTICLES ---
      const tableTop = clientY + 105;
      doc.rect(50, tableTop, 500, 24).fillColor("#F7FAFC").fill();

      doc
        .fillColor("#2D3748")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Description du produit", 60, tableTop + 7)
        .text("Prix unitaire", 300, tableTop + 7, { width: 90, align: "right" })
        .text("Qté", 400, tableTop + 7, { width: 40, align: "center" })
        .text("Total", 450, tableTop + 7, { width: 90, align: "right" });

      let currentY = tableTop + 30;
      doc.font("Helvetica").fontSize(10).fillColor("#4A5568");

      for (const item of order.items) {
        doc
          .text(item.productName, 60, currentY)
          .text(formatPriceFCFA(item.unitPrice), 300, currentY, { width: 90, align: "right" })
          .text(String(item.quantity), 400, currentY, { width: 40, align: "center" })
          .text(formatPriceFCFA(item.total), 450, currentY, { width: 90, align: "right" });

        currentY += 22;
      }

      doc.moveTo(50, currentY + 5).lineTo(550, currentY + 5).strokeColor("#E2E8F0").stroke();

      // --- TOTAUX ---
      const totalsY = currentY + 15;
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#718096")
        .text("Sous-total :", 350, totalsY, { align: "right", width: 100 })
        .fillColor("#1A202C")
        .text(formatPriceFCFA(order.subtotal), 460, totalsY, { align: "right", width: 85 });

      doc
        .fillColor("#718096")
        .text("Frais de livraison :", 350, totalsY + 18, { align: "right", width: 100 })
        .fillColor("#1A202C")
        .text(order.shippingFee === 0 ? "Gratuit / À confirmer" : formatPriceFCFA(order.shippingFee), 460, totalsY + 18, { align: "right", width: 85 });

      doc.rect(340, totalsY + 38, 210, 28).fillColor("#EDF2F7").fill();

      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor("#E50914")
        .text("TOTAL À PAYER :", 350, totalsY + 46, { align: "left", width: 110 })
        .text(formatPriceFCFA(order.total), 460, totalsY + 46, { align: "right", width: 85 });

      // --- PIED DE PAGE ---
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#A0AEC0")
        .text(
          "Merci d'avoir commandé chez PopCorn ! Ce document fait office de facture officielle.",
          50,
          740,
          { align: "center", width: 500 },
        );

      doc.end();

      writeStream.on("finish", () => {
        resolve(filename);
      });

      writeStream.on("error", (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

export function getInvoiceFilePath(filename) {
  return path.join(INVOICES_DIR, filename);
}
