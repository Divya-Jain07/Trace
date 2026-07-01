import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getHistory, getInsights } from "../controllers/dashboard.controller.js";

const router = Router();

router.use(verifyJWT);

router.get('/history',  getHistory);
router.get('/insights', getInsights);

export default router;
