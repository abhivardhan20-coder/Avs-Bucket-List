import { Router, type IRouter } from "express";
import healthRouter from "./health";
import preferencesRouter from "./preferences";
import authRouter from "./auth";

const router: IRouter = Router();

router.use("/health", healthRouter);
router.use("/preferences", preferencesRouter);
router.use("/auth", authRouter);

export default router;
