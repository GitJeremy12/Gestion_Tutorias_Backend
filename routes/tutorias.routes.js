import { Router } from "express";
import {
  create,
  getAll,
  update,
  remove
} from "../controllers/tutoriaController.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Crear tutoría
router.post("/tutorias", verifyToken, create);
//Listar tutorias 
router.get("/tutorias", verifyToken, authorizeRoles("tutor", "admin"), getAll);
//Actualizar tutoría por id
router.put("/tutorias/:id", verifyToken, authorizeRoles("tutor", "admin"), update);
//Eliminar tutoría por id
router.delete("/tutorias/:id", verifyToken, authorizeRoles("tutor", "admin"), remove);

// Listar tutorías disponibles (con cupo)
//router.get("/tutorias/disponibles", verifyToken, getDisponibles);

// Tutorías de un tutor
//router.get("/tutorias/tutor/:tutorId", verifyToken, getByTutor);

export default router;