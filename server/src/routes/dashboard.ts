import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const [
      openWorkOrders,
      inProgress,
      waitingParts,
      completedToday,
      unpaidInvoices,
      lowStockParts,
      upcomingAppointments,
      totalCustomers,
      revenueThisMonthAgg,
    ] = await Promise.all([
      prisma.workOrder.count({ where: { status: { in: ["PENDING", "IN_PROGRESS", "WAITING_PARTS"] } } }),
      prisma.workOrder.count({ where: { status: "IN_PROGRESS" } }),
      prisma.workOrder.count({ where: { status: "WAITING_PARTS" } }),
      prisma.workOrder.count({
        where: { status: "COMPLETED", completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      prisma.invoice.findMany({ where: { status: { in: ["UNPAID", "PARTIAL"] } } }),
      prisma.part.findMany(),
      prisma.appointment.findMany({
        where: { scheduledAt: { gte: new Date() }, status: { in: ["SCHEDULED", "CONFIRMED"] } },
        orderBy: { scheduledAt: "asc" },
        take: 5,
        include: { customer: true, motorcycle: true },
      }),
      prisma.customer.count(),
      prisma.invoice.aggregate({
        where: {
          issuedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          status: { not: "VOID" },
        },
        _sum: { total: true },
      }),
    ]);

    const outstandingBalance = unpaidInvoices.reduce((sum, inv) => sum + (inv.total - inv.amountPaid), 0);
    const lowStock = lowStockParts.filter((p) => p.quantityInStock <= p.reorderLevel);

    res.json({
      openWorkOrders,
      inProgress,
      waitingParts,
      completedToday,
      outstandingInvoices: unpaidInvoices.length,
      outstandingBalance: Math.round(outstandingBalance * 100) / 100,
      lowStockCount: lowStock.length,
      lowStockParts: lowStock.slice(0, 10),
      upcomingAppointments,
      totalCustomers,
      revenueThisMonth: revenueThisMonthAgg._sum.total || 0,
    });
  })
);

export default router;
