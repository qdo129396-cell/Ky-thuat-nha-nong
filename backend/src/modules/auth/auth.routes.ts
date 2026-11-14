import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { asyncHandler } from "../../common/middleware/async-handler.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import type { TokenService } from "../../services/token-service.js";
import type { AuthController } from "./auth.controller.js";

export function createAuthRouter(controller: AuthController, tokenService: TokenService): Router {
  const router = Router();
  const authLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false
  });
  const strictLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false
  });
  const requireAuth = authenticate(tokenService);

  router.post("/register", authLimiter, asyncHandler(controller.register));
  router.post("/login", strictLimiter, asyncHandler(controller.login));
  router.post("/refresh", authLimiter, asyncHandler(controller.refresh));
  router.post("/logout", asyncHandler(controller.logout));
  router.post("/logout-all", requireAuth, asyncHandler(controller.logoutAll));
  router.post("/forgot-password", strictLimiter, asyncHandler(controller.forgotPassword));
  router.post("/reset-password", strictLimiter, asyncHandler(controller.resetPassword));
  router.put("/password", requireAuth, strictLimiter, asyncHandler(controller.changePassword));
  router.get("/me", requireAuth, asyncHandler(controller.me));

  return router;
}

