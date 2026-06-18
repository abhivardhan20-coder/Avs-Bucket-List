import { Router, Request, Response } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { addToBlacklist } from "../lib/blacklist";

const router = Router();

router.post("/logout", authMiddleware, async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    await addToBlacklist(token);
  }
  res.json({ success: true, message: "Logged out successfully" });
});

export default router;
