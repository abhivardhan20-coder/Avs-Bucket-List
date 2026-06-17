import { Router, type IRouter } from "express";
import healthRouter from "./health";
import preferencesRouter from "./preferences";

const router: IRouter = Router();

router.use("/health", healthRouter);
router.use("/preferences", preferencesRouter);

export default router;
