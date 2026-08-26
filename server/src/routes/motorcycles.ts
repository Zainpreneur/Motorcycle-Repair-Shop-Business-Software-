import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const motorcycleSchema = z.object({
  customerId: z.string().min(1),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().optional(),
  vin: z.string().optional(),
  licensePlate: z.string().optional(),
  color: z.string().optional(),
  mileage: z.number().int().optional(),
  notes: z.string().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const customerId = req.query.customerId as string | undefined;
    const motorcycles = await prisma.motorcycle.findMany({
      where: customerId ? { customerId } : undefined,
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(motorcycles);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const motorcycle = await prisma.motorcycle.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { customer: true, workOrders: { orderBy: { createdAt: "desc" } } },
    });
    res.json(motorcycle);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = motorcycleSchema.parse(req.body);
    const motorcycle = await prisma.motorcycle.create({ data });
    res.status(201).json(motorcycle);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = motorcycleSchema.partial().parse(req.body);
    const motorcycle = await prisma.motorcycle.update({ where: { id: req.params.id }, data });
    res.json(motorcycle);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.motorcycle.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
