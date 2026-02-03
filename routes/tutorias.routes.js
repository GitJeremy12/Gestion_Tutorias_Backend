import { Router } from "express";
import {
  create,
  getAll,
  getById,
  update,
  remove,
  getByEstudiante,
  getByTutor,
  getByDateRange,
} from "../controllers/tutoriaController.js";

import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Crear tutoría
router.post("/tutorias", verifyToken, create);

// Listar todas (con filtros por query)
router.get("/tutorias", verifyToken, getAll);

// Filtrar por rango de fechas (query: ?desde=...&hasta=...)
router.get("/tutorias/rango", verifyToken, getByDateRange);

// Tutorías de un estudiante
router.get("/tutorias/estudiante/:estudianteId", verifyToken, getByEstudiante);

// Tutorías de un tutor
router.get("/tutorias/tutor/:tutorId", verifyToken, getByTutor);

// Obtener una por id
router.get("/tutorias/:id", verifyToken, getById);

// Actualizar por id
router.put("/tutorias/:id", verifyToken, update);

// Eliminar por id
router.delete("/tutorias/:id", verifyToken, remove);

export default router;
