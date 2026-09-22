import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/db.js";

const PORT = env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🍿 Serveur PopCorn démarré avec succès sur http://localhost:${PORT}`);
  console.log(`📡 API REST disponible sur http://localhost:${PORT}/api`);
  console.log(`🩺 Health check : http://localhost:${PORT}/api/health`);
});

// Arrêt propre du serveur et déconnexion de Prisma
async function handleShutdown(signal) {
  console.log(`\n🛑 Signal ${signal} reçu. Fermeture du serveur PopCorn...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log("🔒 Connexion base de données fermée.");
    process.exit(0);
  });
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
