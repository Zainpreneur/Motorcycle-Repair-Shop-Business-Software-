import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { badRequest } from "../utils/errors";
import { nextInvoiceNumber } from "../utils/sequence";

const router = Router();
router.use(requireAuth);

const invoiceInclude = {
  payments: true,
  workOrder: {
    include: {
      customer: true,
      motorcycle: true,
      services: true,
      parts: { include: { part: true } },
    },
  },
} as const;

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const invoices = await prisma.invoice.findMany({
      where: status ? { status: status as any } : undefined,
      include: invoiceInclude,
      orderBy: { issuedAt: "desc" },
    });
    res.json(invoices);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findUniqueOrThrow({
      where: { id: req.params.id },
      include: invoiceInclude,
    });
    res.json(invoice);
  })
);

const generateSchema = z.object({
  workOrderId: z.string().min(1),
  taxRate: z.number().nonnegative().default(0),
  dueAt: z.coerce.date().optional(),
});

// Builds an invoice from a work order's current labor + parts line items.
router.post(
  "/generate",
  asyncHandler(async (req, res) => {
    const body = generateSchema.parse(req.body);

    const workOrder = await prisma.workOrder.findUniqueOrThrow({
      where: { id: body.workOrderId },
      include: { services: true, parts: true, invoice: true },
    });

    if (workOrder.invoice) {
      throw badRequest("This work order already has an invoice");
    }

    const laborTotal = workOrder.services.reduce((sum, s) => sum + s.total, 0);
    const partsTotal = workOrder.parts.reduce((sum, p) => sum + p.total, 0);
    const subtotal = Math.round((laborTotal + partsTotal) * 100) / 100;
    const tax = Math.round(subtotal * (body.taxRate / 100) * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    const number = await nextInvoiceNumber();

    const [invoice] = await prisma.$transaction([
      prisma.invoice.create({
        data: {
          number,
          workOrderId: body.workOrderId,
          subtotal,
          taxRate: body.taxRate,
          tax,
          total,
          dueAt: body.dueAt,
        },
        include: invoiceInclude,
      }),
      prisma.workOrder.update({ where: { id: body.workOrderId }, data: { status: "INVOICED" } }),
    ]);

    res.status(201).json(invoice);
  })
);

const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.string().default("cash"),
  notes: z.string().optional(),
});

router.post(
  "/:id/payments",
  asyncHandler(async (req, res) => {
    const body = paymentSchema.parse(req.body);
    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: req.params.id } });

    const newAmountPaid = Math.round((invoice.amountPaid + body.amount) * 100) / 100;
    if (newAmountPaid > invoice.total) {
      throw badRequest("Payment amount exceeds the remaining balance");
    }
    const status = newAmountPaid >= invoice.total ? "PAID" : "PARTIAL";

    const [payment] = await prisma.$transaction([
      prisma.payment.create({ data: { ...body, invoiceId: req.params.id } }),
      prisma.invoice.update({
        where: { id: req.params.id },
        data: {
          amountPaid: newAmountPaid,
          status,
          paidAt: status === "PAID" ? new Date() : null,
        },
      }),
    ]);

    res.status(201).json(payment);
  })
);

router.post(
  "/:id/void",
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: "VOID" },
    });
    res.json(invoice);
  })
);

export default router;
