import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const appointmentSchema = z.object({
  customerId: z.string().min(1),
  motorcycleId: z.string().optional(),
  scheduledAt: z.coerce.date(),
  reason: z.string().optional(),
  status: z.enum(["SCHEDULED", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]).optional(),
  notes: z.string().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const appointments = await prisma.appointment.findMany({
      include: { customer: true, motorcycle: true },
      orderBy: { scheduledAt: "asc" },
    });
    res.json(appointments);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = appointmentSchema.parse(req.body);
    const appointment = await prisma.appointment.create({ data });
    res.status(201).json(appointment);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = appointmentSchema.partial().parse(req.body);
    const appointment = await prisma.appointment.update({ where: { id: req.params.id }, data });
    res.json(appointment);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.appointment.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
