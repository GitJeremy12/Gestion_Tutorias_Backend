import { Router } from "express";
import { login, register,getProfile,updateProfile } from "../controllers/authController.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { validateLogin, validateRegister } from "../middlewares/validate.middleware.js";

const router = Router();

// CA-3.1: POST /api/login
router.post("/login",validateLogin,login);
// CA-3.2: POST /api/register
router.post("/register",validateRegister,register);
// CA-3.3: GET /api/auth/profile
router.get("/auth/profile", verifyToken, getProfile);
// CA-3.4: PUT /api/auth/profile
router.put("/auth/profile", verifyToken, updateProfile);

export default router;