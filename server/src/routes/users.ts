import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Anyone signed in can list technicians/staff, e.g. to populate an assignee dropdown.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const role = req.query.role as string | undefined;
    const users = await prisma.user.findMany({
      where: { active: true, role: role ? (role as any) : undefined },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });
    res.json(users);
  })
);

// Only admins/managers can deactivate or change roles of staff accounts.
router.put(
  "/:id",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const { role, active, name } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role, active, name },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    res.json(user);
  })
);

export default router;
