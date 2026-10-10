import dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const databaseUrl = process.env.DATABASE_URL || (nodeEnv === "development" ? "file:./dev.db" : "");
const clientUrl = process.env.CLIENT_URL || (nodeEnv === "development" ? "http://localhost:5173" : "");
const corsOriginsValue = process.env.CORS_ORIGINS || (nodeEnv === "development" ? clientUrl : "");
const port = Number(process.env.PORT || 5000);

function isAbsoluteHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseCorsOrigins(value) {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const corsOrigins = parseCorsOrigins(corsOriginsValue);

if (!process.env.JWT_SECRET) {
throw new Error("JWT_SECRET est obligatoire dans le fichier .env");
}

if (!databaseUrl) {
throw new Error("DATABASE_URL est obligatoire hors environnement de développement.");
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT doit être un entier compris entre 1 et 65535.");
}

if (nodeEnv === "production") {
  if (!clientUrl || !isAbsoluteHttpUrl(clientUrl)) {
    throw new Error("CLIENT_URL doit être une URL HTTP(S) publique valide en production.");
  }
  if (!corsOrigins.length || corsOrigins.some((origin) => !isAbsoluteHttpUrl(origin))) {
    throw new Error("CORS_ORIGINS doit contenir au moins une origine HTTP(S) valide en production.");
  }
  if (/^(change_me|super_secret|default|test)/i.test(process.env.JWT_SECRET)) {
    throw new Error("JWT_SECRET doit être un secret de production unique et non une valeur d'exemple.");
  }
  if (process.env.SASPAY_ENABLED === "true" && !process.env.SASPAY_API_CONTRACT_CONFIRMED) {
    throw new Error("SASPAY_ENABLED exige la confirmation explicite du contrat API SasPay.");
  }
  if (process.env.SASPAY_ENABLED === "true" && (!process.env.SASPAY_BASE_URL || !process.env.SASPAY_SECRET_KEY)) {
    throw new Error("SASPAY_ENABLED exige SASPAY_BASE_URL et SASPAY_SECRET_KEY en production.");
  }
}

export const env = {
PORT: port,
NODE_ENV: nodeEnv,
CLIENT_URL: clientUrl,
DATABASE_URL: databaseUrl,
CORS_ORIGINS: corsOrigins,

JWT_SECRET: process.env.JWT_SECRET,
JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

OFFICIAL_WHATSAPP_NUMBER:
process.env.OFFICIAL_WHATSAPP_NUMBER || "2290161655462",

OFFICIAL_CONTACT_EMAIL:
process.env.OFFICIAL_CONTACT_EMAIL || "[togbadjamaurel@gmail.com](mailto:togbadjamaurel@gmail.com)",

EMAIL_ENABLED: process.env.EMAIL_ENABLED === "true",

SMTP_HOST: process.env.SMTP_HOST || "",
SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
SMTP_USER: process.env.SMTP_USER || "",
SMTP_PASS: process.env.SMTP_PASS || "",
SMTP_FROM:
process.env.SMTP_FROM || "PopCorn [no-reply@popcorn.bj](mailto:no-reply@popcorn.bj)",

PAYMENT_GATEWAY_ENABLED:
process.env.PAYMENT_GATEWAY_ENABLED === "true",

// Configuration SasPay
SASPAY_ENABLED: process.env.SASPAY_ENABLED === "true",
SASPAY_SECRET_KEY: process.env.SASPAY_SECRET_KEY || "",
SASPAY_WEBHOOK_SECRET: process.env.SASPAY_WEBHOOK_SECRET || "",
// Do not supply a production default here: the endpoint/authentication contract
// must be copied from the merchant's official SasPay documentation.
SASPAY_BASE_URL: process.env.SASPAY_BASE_URL || "",
SASPAY_API_CONTRACT_CONFIRMED:
process.env.SASPAY_API_CONTRACT_CONFIRMED === "true",
SASPAY_WEBHOOK_VERIFICATION_MODE:
process.env.SASPAY_WEBHOOK_VERIFICATION_MODE || "disabled",
};
