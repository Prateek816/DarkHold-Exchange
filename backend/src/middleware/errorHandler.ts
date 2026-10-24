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
    const details = { field: "body", field_message: "Malformed JSON payload" };
    return res.status(400).json({
      code: "VALIDATION_FAILED",
      message: "Malformed JSON payload in request body",
      context: details,
      requestId,
      error: {
        code: "VALIDATION_FAILED",
        message: "Malformed JSON payload in request body",
        details,
        request_id: requestId,
      },
    });
  }

  // Handle Prisma Known Request Errors
  if (err.code && typeof err.code === "string" && err.code.startsWith("P")) {
    console.error(`[DB Error ${err.code}]`, err.message);
    if (err.code === "P2002") {
      const details = { target: err.meta?.target };
      return res.status(409).json({
        code: "IDEMPOTENCY_CONFLICT",
        message: "Unique constraint violation or concurrent conflicting operation.",
        context: details,
        requestId,
        error: {
          code: "IDEMPOTENCY_CONFLICT",
          message: "Unique constraint violation or concurrent conflicting operation.",
          details,
          request_id: requestId,
        },
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
    error: {
      code: "INTERNAL_ERROR",
      message: "An internal server error occurred.",
      details: {},
      request_id: requestId,
    },
  });
}
