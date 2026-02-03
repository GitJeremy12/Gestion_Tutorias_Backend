/**
 * authorizeRoles(...roles)
 * Permite acceso solo si req.user.rol está dentro de roles permitidos.
 * Úsalo junto a verifyToken.
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user?.rol) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return next();
  };
};