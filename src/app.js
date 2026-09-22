import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
import apiRouter from "./routes/index.js";
import { notFoundHandler, globalErrorHandler } from "./middlewares/errorMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configuration CORS pour autoriser le frontend Vite
app.use(
  cors({
    origin: (origin, callback) => {
      // Autoriser les requêtes sans origine (comme Postman ou curl) et les ports frontend locaux
      if (!origin || origin.includes("localhost") || origin.includes("127.0.0.1") || origin === env.CLIENT_URL) {
        callback(null, true);
      } else {
        callback(null, true); // En dev permissif, ajustable en prod
      }
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les factures PDF générées pour téléchargement direct si nécessaire
app.use("/invoices", express.static(path.resolve(__dirname, "../invoices")));

// Montage de l'API REST
app.use("/api", apiRouter);

// Gestion des routes inexistantes et des erreurs
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
