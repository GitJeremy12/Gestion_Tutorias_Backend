export const errorHandler = (err, _req, res, _next) => {
  console.error("❌ Error capturado:", err);

  // Sequelize: validación
  if (err?.name === "SequelizeValidationError") {
    return res.status(400).json({
      message: err.errors?.[0]?.message || "Datos inválidos",
    });
  }

  // Sequelize: unique
  if (err?.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({
      message: "Dato duplicado (violación de único)",
    });
  }

  const statusCode = err.statusCode || 500;

  // Si estás en producción, no expongas detalles
  const message =
    process.env.NODE_ENV === "production"
      ? "Error interno del servidor"
      : err.message || "Error interno del servidor";

  return res.status(statusCode).json({ message });
};
