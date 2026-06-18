import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validateRequest";
import { AuthService } from "../services/AuthService";

const router = Router();

// Ensure the body is empty or not doing anything unexpected
const logoutSchema = z.object({
  body: z.object({}).strict().optional(),
});

router.post("/logout", authMiddleware, validateRequest(logoutSchema), async (req: Request, res: Response) => {
  const result = await AuthService.logout(req.headers.authorization);
  res.json(result);
});

export default router;
