import fs from "fs";
import { prisma } from "../config/db.js";
import { generateInvoicePdf, getInvoiceFilePath } from "../services/invoiceService.js";

export async function downloadInvoice(req, res, next) {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: {
        items: true,
        invoice: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Commande introuvable.",
      });
    }

    // Sécurité : autoriser uniquement si admin ou si client propriétaire
    if (order.userId !== null) {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentification requise pour télécharger cette facture.",
        });
      }
      if (req.user.role !== "ADMIN" && order.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Accès refusé à cette facture.",
        });
      }
    } else {
      if (!req.user || req.user.role !== "ADMIN") {
        return res.status(403).json({
          success: false,
          message: "Accès refusé à cette facture.",
        });
      }
    }

    let pdfFilename = order.invoice?.pdfPath;
    let filePath = pdfFilename ? getInvoiceFilePath(pdfFilename) : null;

    // Si le fichier n'existe pas encore sur disque, le générer
    if (!filePath || !fs.existsSync(filePath)) {
      pdfFilename = await generateInvoicePdf(order);
      filePath = getInvoiceFilePath(pdfFilename);

      if (order.invoice) {
        await prisma.invoice.update({
          where: { id: order.invoice.id },
          data: { pdfPath: pdfFilename },
        });
      }
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Facture_${order.orderNumber}.pdf"`,
    );

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
}
