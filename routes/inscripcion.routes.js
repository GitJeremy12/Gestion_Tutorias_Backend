import { Router } from "express";
import {
  inscribir,
  getByTutoria,
  getByEstudiante,
  registrarAsistencia,
  calificar,
  cancelar,
  getAll,
} from "../controllers/inscripcionController.js";

import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Inscribir estudiante
router.post("/inscripciones", verifyToken, inscribir);

// Ver inscritos de una tutoría
router.get("/inscripciones/tutoria/:tutoriaId", verifyToken, getByTutoria);

// Ver inscripciones de un estudiante
router.get("/inscripciones/estudiante/:estudianteId", verifyToken, getByEstudiante);

// Registrar asistencia
router.put("/inscripciones/:id/asistencia", verifyToken, registrarAsistencia);

// Calificar tutoría
router.put("/inscripciones/:id/calificar", verifyToken, calificar);

// Cancelar inscripción
router.delete("/inscripciones/:id", verifyToken, cancelar);

// Listar todas (admin)
router.get("/inscripciones", verifyToken, getAll);

export default router;