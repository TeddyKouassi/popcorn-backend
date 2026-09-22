import dotenv from "dotenv";

dotenv.config();

if (!process.env.JWT_SECRET) {
throw new Error("JWT_SECRET est obligatoire dans le fichier .env");
}

export const env = {
PORT: process.env.PORT || 5000,
NODE_ENV: process.env.NODE_ENV || "development",
CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",

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
};
