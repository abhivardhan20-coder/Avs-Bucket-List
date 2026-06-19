import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validateRequest";
import { AuthService } from "../services/AuthService";

const router = Router();

const authSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional()
  }).strict()
});

const resetSchema = z.object({
  body: z.object({
    email: z.string().email()
  }).strict()
});

router.post("/register", validateRequest(authSchema), async (req: Request, res: Response) => {
  const result = await AuthService.register(req.body.email, req.body.password);
  res.json(result);
});

router.post("/login", validateRequest(authSchema), async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body.email, req.body.password);
  res.json(result);
});

router.post("/reset-password", validateRequest(resetSchema), async (req: Request, res: Response) => {
  const result = await AuthService.resetPassword(req.body.email);
  res.json(result);
});

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
