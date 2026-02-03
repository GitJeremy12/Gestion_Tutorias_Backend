import jwt from "jsonwebtoken";
import { TOKEN_KEY } from "../config/config.js";

export const verifyToken = (req, res, next) => {
  const auth = req.header("Authorization");

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!TOKEN_KEY) {
    // Esto es problema del servidor, no del usuario
    return res.status(500).json({ message: "Falta TOKEN_KEY en configuración" });
  }
  const token = auth.split(" ")[1];

  try {
    const decoded = jwt.verify(token, TOKEN_KEY);
    req.user = decoded;
    return next();
  } catch (err) {
    // Mensajes útiles para debug
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expirado" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Token inválido" });
    }
    return res.status(401).json({ message: "Unauthorized" });
  }
};


