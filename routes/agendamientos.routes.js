import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import {create,getUpcoming,cancel,confirm} from "../controllers/agendamientoControllers.js";

const router = Router();

router.post("/agendamientos", verifyToken, create);
router.get("/agendamientos/upcoming", verifyToken, getUpcoming);
router.put("/agendamientos/:id/cancel", verifyToken, cancel);
router.put("/agendamientos/:id/confirm", verifyToken, confirm);

export default router;
