import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/db.js";

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Accès refusé. Aucun jeton d'authentification fourni.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur introuvable ou compte désactivé.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Jeton expiré ou invalide.",
    });
  }
}

// Middleware optionnel pour attacher l'utilisateur s'il est connecté sans bloquer les invités
export async function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, email: true, phone: true, role: true },
      });
      if (user) {
        req.user = user;
      }
    }
  } catch {
    // Ignorer silencieusement si le token est invalide ou absent
  }
  next();
}
