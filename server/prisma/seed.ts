import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const techPassword = await bcrypt.hash("tech123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@motoshop.test" },
    update: {},
    create: {
      name: "Shop Admin",
      email: "admin@motoshop.test",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  const tech = await prisma.user.upsert({
    where: { email: "tech@motoshop.test" },
    update: {},
    create: {
      name: "Alex Wrench",
      email: "tech@motoshop.test",
      password: techPassword,
      role: "TECHNICIAN",
    },
  });

  const customer = await prisma.customer.upsert({
    where: { id: "seed-customer-1" },
    update: {},
    create: {
      id: "seed-customer-1",
      name: "Jordan Rider",
      email: "jordan@example.com",
      phone: "555-0100",
      address: "123 Main St, Anytown",
    },
  });

  const motorcycle = await prisma.motorcycle.upsert({
    where: { id: "seed-moto-1" },
    update: {},
    create: {
      id: "seed-moto-1",
      customerId: customer.id,
      make: "Honda",
      model: "CB500F",
      year: 2021,
      vin: "1HFSC5406M2000001",
      licensePlate: "MOTO123",
      color: "Red",
      mileage: 8500,
    },
  });

  // SQLite doesn't support createMany's skipDuplicates, so seed the catalog
  // with individual upserts keyed on a fixed id instead.
  const services = [
    { id: "seed-svc-1", name: "Oil & Filter Change", category: "Maintenance", defaultRate: 95, estimatedHours: 0.5 },
    { id: "seed-svc-2", name: "Chain & Sprocket Replacement", category: "Drivetrain", defaultRate: 95, estimatedHours: 1.5 },
    { id: "seed-svc-3", name: "Brake Pad Replacement", category: "Brakes", defaultRate: 95, estimatedHours: 1 },
    { id: "seed-svc-4", name: "Full Tune-Up", category: "Maintenance", defaultRate: 95, estimatedHours: 3 },
    { id: "seed-svc-5", name: "Tire Replacement", category: "Tires", defaultRate: 95, estimatedHours: 0.75 },
  ];
  for (const svc of services) {
    await prisma.service.upsert({ where: { id: svc.id }, update: {}, create: svc });
  }

  const parts = [
    { id: "seed-part-1", sku: "OIL-10W40-1L", name: "Motorcycle Oil 10W-40 (1L)", category: "Fluids", quantityInStock: 40, reorderLevel: 10, unitCost: 6, unitPrice: 12 },
    { id: "seed-part-2", sku: "FLT-OIL-STD", name: "Oil Filter - Standard", category: "Filters", quantityInStock: 25, reorderLevel: 8, unitCost: 4, unitPrice: 10 },
    { id: "seed-part-3", sku: "CHN-520-114", name: "Drive Chain 520 x 114L", category: "Drivetrain", quantityInStock: 6, reorderLevel: 3, unitCost: 35, unitPrice: 70 },
    { id: "seed-part-4", sku: "BRK-PAD-FRT", name: "Front Brake Pads", category: "Brakes", quantityInStock: 3, reorderLevel: 5, unitCost: 18, unitPrice: 40 },
    { id: "seed-part-5", sku: "TIRE-160-60-17", name: "Rear Tire 160/60-17", category: "Tires", quantityInStock: 4, reorderLevel: 2, unitCost: 80, unitPrice: 160 },
  ];
  for (const part of parts) {
    await prisma.part.upsert({ where: { id: part.id }, update: {}, create: part });
  }

  const workOrder = await prisma.workOrder.upsert({
    where: { id: "seed-wo-1" },
    update: {},
    create: {
      id: "seed-wo-1",
      number: 1001,
      customerId: customer.id,
      motorcycleId: motorcycle.id,
      technicianId: tech.id,
      status: "IN_PROGRESS",
      priority: "NORMAL",
      complaint: "Bike due for scheduled maintenance, chain feels loose.",
      odometerIn: motorcycle.mileage,
    },
  });

  console.log("Seed complete:", { admin: admin.email, tech: tech.email, workOrder: workOrder.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
