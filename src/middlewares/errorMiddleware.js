export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route introuvable : ${req.method} ${req.originalUrl}`,
  });
}

export function globalErrorHandler(err, req, res, next) {
  console.error("❌ Erreur serveur non gérée :", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Une erreur interne est survenue sur le serveur.";

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
}
