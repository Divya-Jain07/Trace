import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { registerUser, loginUser, logoutUser, refreshAccessToken } from "../controllers/auth.controller.js";

const router = Router();

router.post('/register', registerUser)
router.post('/login',    loginUser)
router.post('/logout',   verifyJWT, logoutUser)
router.post('/refresh-token', refreshAccessToken)  // uses httpOnly cookie — no JWT needed


export default router