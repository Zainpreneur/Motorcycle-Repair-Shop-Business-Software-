import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/errors";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }

  // Prisma "record not found" style errors
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code?: string }).code;
    if (code === "P2025") {
      return res.status(404).json({ error: "Record not found" });
    }
    if (code === "P2002") {
      return res.status(409).json({ error: "A record with that unique value already exists" });
    }
  }

  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Route not found" });
}
