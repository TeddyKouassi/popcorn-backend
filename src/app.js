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
      // Les outils serveur (health check, curl) n'envoient pas d'origine. Les
      // navigateurs sont strictement limités aux origines configurées.
      const isLocalDevelopmentOrigin =
        env.NODE_ENV !== "production" &&
        (origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:"));
      if (!origin || isLocalDevelopmentOrigin || env.CORS_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Origine CORS non autorisée."));
      }
    },
    credentials: true,
  }),
);

// Middleware de capture du corps brut pour vérification de signature des webhooks (ex: SasPay)
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

// Servir les factures PDF générées pour téléchargement direct si nécessaire
app.use("/invoices", express.static(path.resolve(__dirname, "../invoices")));

// Montage de l'API REST
app.use("/api", apiRouter);

// Gestion des routes inexistantes et des erreurs
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
