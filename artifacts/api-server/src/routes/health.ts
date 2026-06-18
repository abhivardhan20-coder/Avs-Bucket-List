import { Router, type IRouter } from "express";
import { z } from "zod";
import { HealthCheckResponse } from "@workspace/api-zod";
import { validateRequest } from "../middlewares/validateRequest";

const router: IRouter = Router();

const healthSchema = z.object({
  body: z.object({}).strict().optional(),
  query: z.object({}).strict().optional(),
});

router.get("/healthz", validateRequest(healthSchema), (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;
