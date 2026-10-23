import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "@/middleware/auth";
import { prisma } from "@/config/db";
import { UnauthenticatedError } from "@/utils/errors";

const router = Router();

router.get("/me", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new UnauthenticatedError();
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
