import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const partSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  quantityInStock: z.number().int().default(0),
  reorderLevel: z.number().int().default(5),
  unitCost: z.number().nonnegative().default(0),
  unitPrice: z.number().nonnegative().default(0),
  supplier: z.string().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const lowStock = req.query.lowStock === "true";
    const parts = await prisma.part.findMany({ orderBy: { name: "asc" } });
    res.json(lowStock ? parts.filter((p) => p.quantityInStock <= p.reorderLevel) : parts);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = partSchema.parse(req.body);
    const part = await prisma.part.create({ data });
    res.status(201).json(part);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = partSchema.partial().parse(req.body);
    const part = await prisma.part.update({ where: { id: req.params.id }, data });
    res.json(part);
  })
);

// Adjust stock up or down, e.g. when receiving a shipment or doing a manual count correction.
router.post(
  "/:id/adjust-stock",
  asyncHandler(async (req, res) => {
    const { delta } = z.object({ delta: z.number().int() }).parse(req.body);
    const part = await prisma.part.update({
      where: { id: req.params.id },
      data: { quantityInStock: { increment: delta } },
    });
    res.json(part);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.part.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
