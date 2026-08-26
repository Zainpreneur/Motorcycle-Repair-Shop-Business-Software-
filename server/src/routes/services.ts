import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  defaultRate: z.number().nonnegative().default(0),
  estimatedHours: z.number().nonnegative().default(0),
});

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const services = await prisma.service.findMany({ orderBy: { name: "asc" } });
    res.json(services);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = serviceSchema.parse(req.body);
    const service = await prisma.service.create({ data });
    res.status(201).json(service);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = serviceSchema.partial().parse(req.body);
    const service = await prisma.service.update({ where: { id: req.params.id }, data });
    res.json(service);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.service.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
