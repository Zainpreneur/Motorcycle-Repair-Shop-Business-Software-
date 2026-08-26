import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { badRequest } from "../utils/errors";
import { nextWorkOrderNumber } from "../utils/sequence";

const router = Router();
router.use(requireAuth);

const workOrderInclude = {
  customer: true,
  motorcycle: true,
  technician: { select: { id: true, name: true, email: true } },
  services: { include: { service: true } },
  parts: { include: { part: true } },
  invoice: true,
} as const;

const workOrderSchema = z.object({
  customerId: z.string().min(1),
  motorcycleId: z.string().min(1),
  technicianId: z.string().optional().nullable(),
  status: z
    .enum(["PENDING", "IN_PROGRESS", "WAITING_PARTS", "COMPLETED", "INVOICED", "CANCELLED"])
    .optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  complaint: z.string().optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  odometerIn: z.number().int().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, technicianId, customerId } = req.query as Record<string, string | undefined>;
    const workOrders = await prisma.workOrder.findMany({
      where: {
        status: status as any,
        technicianId: technicianId || undefined,
        customerId: customerId || undefined,
      },
      include: workOrderInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json(workOrders);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const workOrder = await prisma.workOrder.findUniqueOrThrow({
      where: { id: req.params.id },
      include: workOrderInclude,
    });
    res.json(workOrder);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = workOrderSchema.parse(req.body);
    const number = await nextWorkOrderNumber();
    const workOrder = await prisma.workOrder.create({
      data: { ...data, number },
      include: workOrderInclude,
    });
    res.status(201).json(workOrder);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = workOrderSchema.partial().parse(req.body);
    const updateData: Record<string, unknown> = { ...data };
    if (data.status === "COMPLETED") updateData.completedAt = new Date();
    const workOrder = await prisma.workOrder.update({
      where: { id: req.params.id },
      data: updateData,
      include: workOrderInclude,
    });
    res.json(workOrder);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.workOrder.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

// --- Line items: labor / services performed on this work order ---

const serviceLineSchema = z.object({
  serviceId: z.string().optional().nullable(),
  description: z.string().min(1),
  laborHours: z.number().nonnegative().default(0),
  laborRate: z.number().nonnegative().default(0),
});

router.post(
  "/:id/services",
  asyncHandler(async (req, res) => {
    const body = serviceLineSchema.parse(req.body);
    const total = Math.round(body.laborHours * body.laborRate * 100) / 100;
    const line = await prisma.workOrderService.create({
      data: { ...body, workOrderId: req.params.id, total },
    });
    res.status(201).json(line);
  })
);

router.delete(
  "/:id/services/:lineId",
  asyncHandler(async (req, res) => {
    await prisma.workOrderService.delete({ where: { id: req.params.lineId } });
    res.status(204).send();
  })
);

// --- Line items: parts consumed on this work order (also decrements stock) ---

const partLineSchema = z.object({
  partId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.number().nonnegative().optional(),
});

router.post(
  "/:id/parts",
  asyncHandler(async (req, res) => {
    const body = partLineSchema.parse(req.body);

    const part = await prisma.part.findUniqueOrThrow({ where: { id: body.partId } });
    if (part.quantityInStock < body.quantity) {
      throw badRequest(
        `Not enough stock for "${part.name}" (have ${part.quantityInStock}, need ${body.quantity})`
      );
    }

    const unitPrice = body.unitPrice ?? part.unitPrice;
    const total = Math.round(unitPrice * body.quantity * 100) / 100;

    const [line] = await prisma.$transaction([
      prisma.workOrderPart.create({
        data: {
          workOrderId: req.params.id,
          partId: body.partId,
          quantity: body.quantity,
          unitPrice,
          total,
        },
      }),
      prisma.part.update({
        where: { id: body.partId },
        data: { quantityInStock: { decrement: body.quantity } },
      }),
    ]);

    res.status(201).json(line);
  })
);

router.delete(
  "/:id/parts/:lineId",
  asyncHandler(async (req, res) => {
    const line = await prisma.workOrderPart.findUniqueOrThrow({ where: { id: req.params.lineId } });
    await prisma.$transaction([
      prisma.workOrderPart.delete({ where: { id: req.params.lineId } }),
      prisma.part.update({
        where: { id: line.partId },
        data: { quantityInStock: { increment: line.quantity } },
      }),
    ]);
    res.status(204).send();
  })
);

export default router;
