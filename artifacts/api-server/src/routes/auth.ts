import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validateRequest";
import { AuthService } from "../services/AuthService";

const router = Router();

// Ensure the body is empty or not doing anything unexpected
const logoutSchema = z.object({
  body: z.object({}).strict().optional(),
  headers: z.object({
    authorization: z.string().startsWith("Bearer ")
  }).passthrough() // allow other headers
});

router.post("/logout", authMiddleware, validateRequest(logoutSchema), async (req: AuthenticatedRequest, res: Response) => {
  const result = await AuthService.logout(req.headers.authorization, req.user?.sub);
  res.json(result);
});

export default router;
