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

const logoutSchema = z.object({
  body: z.object({}).strict().optional(),
  headers: z.object({
    authorization: z.string().startsWith("Bearer ")
  }).passthrough()
});

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User registered successfully
 */
router.post("/register", validateRequest(authSchema), async (req: Request, res: Response) => {
  const result = await AuthService.register(req.body.email, req.body.password);
  res.json(result);
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login an existing user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully logged in
 */
router.post("/login", validateRequest(authSchema), async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body.email, req.body.password);
  res.json(result);
});

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Request a password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset instructions sent
 */
router.post("/reset-password", validateRequest(resetSchema), async (req: Request, res: Response) => {
  const result = await AuthService.resetPassword(req.body.email);
  res.json(result);
});

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", authMiddleware, validateRequest(logoutSchema), async (req: AuthenticatedRequest, res: Response) => {
  const result = await AuthService.logout(req.headers.authorization, req.user?.sub);
  res.json(result);
});

export default router;
