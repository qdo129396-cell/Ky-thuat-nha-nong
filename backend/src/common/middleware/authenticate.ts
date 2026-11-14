import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";
import type { TokenService } from "../../services/token-service.js";

export function authenticate(tokenService: TokenService): RequestHandler {
  return async (request, _response, next) => {
    try {
      const authorization = request.header("authorization");
      if (!authorization?.startsWith("Bearer ")) {
        throw new AppError(401, "AUTHENTICATION_REQUIRED", "Vui lòng đăng nhập để tiếp tục.");
      }
      request.auth = await tokenService.verifyAccessToken(authorization.slice(7));
      next();
    } catch (error) {
      next(error);
    }
  };
}

