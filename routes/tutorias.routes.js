import { Router } from "express";
import {
  create,
  getAll,
  getById,
  update,
  remove,
  getByTutor,
  getDisponibles,
} from "../controllers/tutoriaController.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Crear tutoría
router.post("/tutorias", verifyToken, create);
//Listar tutorias 
router.get("/tutorias", verifyToken, authorizeRoles("tutor", "admin"), getAll);

// Listar tutorías disponibles (con cupo)
//router.get("/tutorias/disponibles", verifyToken, getDisponibles);

// Tutorías de un tutor
//router.get("/tutorias/tutor/:tutorId", verifyToken, getByTutor);

// Listar todas (con filtros)
//router.get("/tutorias", verifyToken, getAll);

// Obtener una por id
//router.get("/tutorias/:id", verifyToken, getById);

// Actualizar por id
//router.put("/tutorias/:id", verifyToken, update);

// Eliminar por id
//router.delete("/tutorias/:id", verifyToken, remove);

export default router;