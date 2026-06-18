import { Router, Request, Response } from "express";
import { z } from "zod";
import { validateRequest } from "../middlewares/validateRequest";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

const preferencesSchema = z.object({
  body: z.object({
    theme: z.enum(["light", "dark", "system"]),
    notificationsEnabled: z.boolean(),
  }),
});

// Example route demonstrating auth and validation middleware
router.post(
  "/",
  authMiddleware,
  validateRequest(preferencesSchema),
  (req: Request, res: Response) => {
    const { theme, notificationsEnabled } = req.body;
    
    // Process preferences...

    res.json({
      success: true,
      data: {
        theme,
        notificationsEnabled,
      },
    });
  }
);

export default router;
