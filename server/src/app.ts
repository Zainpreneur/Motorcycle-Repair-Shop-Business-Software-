import express from "express";
import cors from "cors";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/auth";
import customerRoutes from "./routes/customers";
import motorcycleRoutes from "./routes/motorcycles";
import appointmentRoutes from "./routes/appointments";
import workOrderRoutes from "./routes/workorders";
import serviceRoutes from "./routes/services";
import partRoutes from "./routes/parts";
import invoiceRoutes from "./routes/invoices";
import dashboardRoutes from "./routes/dashboard";
import userRoutes from "./routes/users";

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/customers", customerRoutes);
  app.use("/api/motorcycles", motorcycleRoutes);
  app.use("/api/appointments", appointmentRoutes);
  app.use("/api/work-orders", workOrderRoutes);
  app.use("/api/services", serviceRoutes);
  app.use("/api/parts", partRoutes);
  app.use("/api/invoices", invoiceRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/users", userRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
