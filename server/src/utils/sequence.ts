import { prisma } from "../lib/prisma";

// SQLite doesn't support @default(autoincrement()) on a non-id column, so
// human-friendly sequential numbers (work order #, invoice #) are assigned
// here instead. Good enough for a single-shop, low-concurrency workload.
export async function nextWorkOrderNumber(): Promise<number> {
  const last = await prisma.workOrder.findFirst({ orderBy: { number: "desc" } });
  return (last?.number ?? 1000) + 1;
}

export async function nextInvoiceNumber(): Promise<number> {
  const last = await prisma.invoice.findFirst({ orderBy: { number: "desc" } });
  return (last?.number ?? 5000) + 1;
}
