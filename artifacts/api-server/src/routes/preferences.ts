import { Router, Request, Response } from "express";
import { z } from "zod";
import { validateRequest } from "../middlewares/validateRequest";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/authMiddleware";
import { PreferencesService } from "../services/PreferencesService";

const router = Router();

const preferencesSchema = z.object({
  body: z.object({
    theme: z.enum(["light", "dark", "system"]),
    notificationsEnabled: z.boolean(),
  }),
});

router.get(
  "/",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const prefs = await PreferencesService.getPreferences(userId);
    res.json({ success: true, data: prefs });
    return;
  }
);

router.post(
  "/",
  authMiddleware,
  validateRequest(preferencesSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    const { theme, notificationsEnabled } = req.body;
    
    const updatedPrefs = await PreferencesService.updatePreferences(userId, {
      theme,
      notificationsEnabled,
    });

    res.json({
      success: true,
      data: updatedPrefs,
    });
    return;
  }
);

export default router;
