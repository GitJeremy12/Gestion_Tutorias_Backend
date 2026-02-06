import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { getByEstudiante, getByTutor, getSemanal, exportPDF } from "../controllers/reporteControllers.js";

const router = Router();
//Reporte estudiante
router.get("/reportes/estudiante/:estudianteId", verifyToken, authorizeRoles("admin", "estudiante"), getByEstudiante);
//Reporte tutor
router.get("/reportes/tutor/:tutorId", verifyToken, authorizeRoles("admin", "tutor"), getByTutor);
//Reporte semanal
router.get("/reportes/semanal", verifyToken, authorizeRoles("admin"), getSemanal);
//Reporte PDF
router.get("/reportes/pdf", verifyToken, authorizeRoles("admin", "tutor", "estudiante"), exportPDF);

export default router;
