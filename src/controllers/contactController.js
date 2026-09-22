import { prisma } from "../config/db.js";
import { sendContactNotificationEmail } from "../services/emailService.js";

export async function submitContactMessage(req, res, next) {
  try {
    const { name, email, phone, subject, message } = req.body;

    const savedMessage = await prisma.contactMessage.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : null,
        subject: subject.trim(),
        message: message.trim(),
      },
    });

    // Envoi d'une notification email ou simulation
    try {
      await sendContactNotificationEmail(savedMessage);
    } catch (e) {
      console.error("Erreur notification contact :", e.message);
    }

    res.status(201).json({
      success: true,
      message: "Votre message a bien été envoyé. Notre équipe vous répondra rapidement.",
      data: savedMessage,
    });
  } catch (error) {
    next(error);
  }
}

export async function getContactMessages(req, res, next) {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
}

export async function markMessageAsRead(req, res, next) {
  try {
    const updated = await prisma.contactMessage.update({
      where: { id: Number(req.params.id) },
      data: { isRead: true },
    });

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
