import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error.js";

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new AppError(404, "ROUTE_NOT_FOUND", `Không tìm thấy ${request.method} ${request.path}.`));
};

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  if (typeof error === "object" && error !== null && "type" in error && error.type === "entity.too.large") {
    response.status(413).json({
      success: false,
      error: { code: "PAYLOAD_TOO_LARGE", message: "Nội dung gửi lên vượt quá dung lượng cho phép." },
      requestId: request.id
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Dữ liệu không hợp lệ.",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      },
      requestId: request.id
    });
    return;
  }

  const appError = error instanceof AppError
    ? error
    : new AppError(500, "INTERNAL_SERVER_ERROR", "Đã xảy ra lỗi hệ thống.");

  if (!(error instanceof AppError) && process.env.NODE_ENV !== "test") {
    request.log?.error({ err: error }, "Unhandled request error");
  }

  response.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details === undefined ? {} : { details: appError.details })
    },
    requestId: request.id
  });
};
