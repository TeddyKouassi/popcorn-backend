import { prisma } from "../config/db.js";
import { generateInvoicePdf } from "./invoiceService.js";
import { sendOrderConfirmationEmail } from "./emailService.js";
import { buildWhatsAppOrderUrl } from "./whatsappService.js";

/**
 * Création d'une commande avec TRANSACTION PRISMA ATOMIQUE
 * Vérifie les stocks, recalcule les prix côté serveur, décrémente les stocks
 * et génère la facture associée de façon sécurisée.
 */
export async function createOrder({
  name,
  phone,
  email,
  city,
  address,
  note,
  paymentMethod = "CASH_ON_DELIVERY",
  items,
  userId = null,
}) {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Récupération des IDs produits demandés
    const productIds = items.map((i) => i.productId);
    const dbProducts = await tx.product.findMany({
      where: {
        id: { in: productIds },
      },
    });

    const productsMap = new Map(dbProducts.map((p) => [p.id, p]));

    // 2. Vérification de l'existence, de l'état actif et des stocks de chaque produit
    let calculatedSubtotal = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = productsMap.get(item.productId);

      if (!product) {
        throw new Error(`Le produit avec l'ID ${item.productId} n'existe pas.`);
      }

      if (!product.isActive) {
        throw new Error(`Le produit "${product.name}" n'est plus disponible à la vente.`);
      }

      if (product.stock < item.quantity) {
        throw new Error(
          `Stock insuffisant pour "${product.name}". Disponible : ${product.stock}, demandé : ${item.quantity}.`,
        );
      }

      const itemTotal = product.price * item.quantity;
      calculatedSubtotal += itemTotal;

      orderItemsData.push({
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        total: itemTotal,
      });

      // 3. Décrémentation atomique du stock
      await tx.product.update({
        where: { id: product.id },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    // 4. Génération d'un numéro de commande unique (ex: POP-2026-1042)
    const count = await tx.order.count();
    const currentYear = new Date().getFullYear();
    const orderNumber = `POP-${currentYear}-${String(count + 1001).padStart(4, "0")}`;
    const invoiceNumber = `FAC-${currentYear}-${String(count + 1001).padStart(4, "0")}`;

    const shippingFee = 0; // Frais de livraison (ajustable selon zone ou confirmation)
    const calculatedTotal = calculatedSubtotal + shippingFee;

    // 5. Création de la commande
    const createdOrder = await tx.order.create({
      data: {
        orderNumber,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail: email ? email.trim().toLowerCase() : null,
        city: city.trim(),
        address: address.trim(),
        note: note ? note.trim() : null,
        subtotal: calculatedSubtotal,
        shippingFee,
        total: calculatedTotal,
        paymentMethod,
        paymentStatus: "PENDING",
        status: "PENDING",
        userId,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: true,
      },
    });

    // 6. Création de l'enregistrement de facture
    const createdInvoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        orderId: createdOrder.id,
        totalAmount: calculatedTotal,
      },
    });

    return { order: createdOrder, invoice: createdInvoice };
  });

  const fullOrder = await prisma.order.findUnique({
    where: { id: result.order.id },
    include: {
      items: true,
      invoice: true,
    },
  });

  // 7. Génération de la facture PDF en arrière-plan
  try {
    const pdfPath = await generateInvoicePdf(fullOrder);
    await prisma.invoice.update({
      where: { orderId: fullOrder.id },
      data: { pdfPath },
    });
    fullOrder.invoice.pdfPath = pdfPath;
  } catch (pdfErr) {
    console.error("⚠️ Erreur lors de la génération du PDF de facture :", pdfErr.message);
  }

  // 8. Envoi de l'email de confirmation (si activé)
  try {
    if (fullOrder.customerEmail) {
      await sendOrderConfirmationEmail(fullOrder);
    }
  } catch (emailErr) {
    console.error("⚠️ Erreur lors de l'envoi de l'email de confirmation :", emailErr.message);
  }

  // 9. Génération du lien WhatsApp officiel avec le numéro de commande réel
  const whatsappUrl = buildWhatsAppOrderUrl(fullOrder);

  return {
    ...fullOrder,
    whatsappUrl,
  };
}

export async function getOrderById(id, requestingUser = null) {
  const order = await prisma.order.findUnique({
    where: { id: Number(id) },
    include: {
      items: true,
      invoice: true,
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!order) {
    const error = new Error("Commande introuvable.");
    error.statusCode = 404;
    throw error;
  }

  // Vérification des droits : si un utilisateur client consulte, il doit être le propriétaire
  if (requestingUser && requestingUser.role !== "ADMIN" && order.userId !== requestingUser.id) {
    const error = new Error("Accès interdit à cette commande.");
    error.statusCode = 403;
    throw error;
  }

  return order;
}

export async function getOrderByNumber(orderNumber) {
  const order = await prisma.order.findUnique({
    where: { orderNumber: orderNumber.trim() },
    include: {
      items: true,
      invoice: {
        select: { invoiceNumber: true, issuedAt: true, totalAmount: true },
      },
    },
  });

  if (!order) {
    const error = new Error(`Aucune commande trouvée avec la référence "${orderNumber}".`);
    error.statusCode = 404;
    throw error;
  }

  return order;
}

export async function getUserOrders(userId) {
  return prisma.order.findMany({
    where: { userId: Number(userId) },
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      invoice: true,
    },
  });
}

export async function getAllOrders({ status, page = 1, limit = 20 }) {
  const where = status ? { status } : {};
  const take = Number(limit);
  const skip = (Number(page) - 1) * take;

  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        invoice: true,
      },
    }),
  ]);

  return {
    orders,
    pagination: {
      total,
      page: Number(page),
      limit: take,
      totalPages: Math.ceil(total / take),
    },
  };
}

export async function updateOrderStatus(id, status, paymentStatus) {
  const data = {};
  if (status) data.status = status;
  if (paymentStatus) data.paymentStatus = paymentStatus;

  const updated = await prisma.order.update({
    where: { id: Number(id) },
    data,
    include: {
      items: true,
      invoice: true,
    },
  });

  return updated;
}
