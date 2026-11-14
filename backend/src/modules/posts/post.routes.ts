import { Router } from "express";
import { asyncHandler } from "../../common/middleware/async-handler.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { optionalAuthenticate } from "../../common/middleware/optional-authenticate.js";
import type { TokenService } from "../../services/token-service.js";
import type { PostController } from "./post.controller.js";

export function createPostRouter(controller: PostController, tokenService: TokenService): Router {
  const router = Router();
  const requireAuth = authenticate(tokenService);

  router.get("/categories", asyncHandler(controller.categories));
  router.get("/posts", optionalAuthenticate(tokenService), asyncHandler(controller.list));
  router.get("/posts/mine", requireAuth, asyncHandler(controller.mine));
  router.get("/posts/mine/:id", requireAuth, asyncHandler(controller.ownDetail));
  router.post("/posts", requireAuth, asyncHandler(controller.create));
  router.patch("/posts/:id", requireAuth, asyncHandler(controller.update));
  router.delete("/posts/:id", requireAuth, asyncHandler(controller.remove));
  router.get("/posts/:slug", optionalAuthenticate(tokenService), asyncHandler(controller.detail));

  return router;
}
