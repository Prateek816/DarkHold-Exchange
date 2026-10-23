import { Request, Response, NextFunction } from "express";
import { AppError } from "@/utils/errors";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId =
    err.requestId ||
    (req.headers["x-request-id"] as string) ||
    `REQ-${Date.now().toString(36).toUpperCase()}`;

  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toPayload());
  }

  // Handle SyntaxError / Body parser error
  if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
    return res.status(400).json({
      code: "VALIDATION_FAILED",
      message: "Malformed JSON payload in request body",
      context: { field: "body", field_message: "Malformed JSON payload" },
      requestId,
    });
  }

  // Handle Prisma Known Request Errors
  if (err.code && typeof err.code === "string" && err.code.startsWith("P")) {
    console.error(`[DB Error ${err.code}]`, err.message);
    if (err.code === "P2002") {
      return res.status(409).json({
        code: "IDEMPOTENCY_CONFLICT",
        message: "Unique constraint violation or concurrent conflicting operation.",
        context: { target: err.meta?.target },
        requestId,
      });
    }
  }

  // Generic unhandled error
  console.error(`[Internal Server Error ${requestId}]`, err);
  return res.status(500).json({
    code: "INTERNAL_ERROR",
    message: "An internal server error occurred.",
    context: { request_id: requestId },
    requestId,
  });
}
