import { Router, type IRouter } from "express";
import healthRouter from "./health";
import preferencesRouter from "./preferences";
import authRouter from "./auth";
import tmdbRouter from "./tmdb";

import { authMiddleware } from "../middlewares/authMiddleware";

const router: IRouter = Router();

router.use("/health", healthRouter);
router.use("/preferences", preferencesRouter);
router.use("/auth", authRouter);
router.use("/tmdb", authMiddleware, tmdbRouter);

export default router;
