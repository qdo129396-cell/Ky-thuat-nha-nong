import { Router } from "express";
import { asyncHandler } from "../../common/middleware/async-handler.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { optionalAuthenticate } from "../../common/middleware/optional-authenticate.js";
import type { TokenService } from "../../services/token-service.js";
import type { SocialController } from "./social.controller.js";

export function createSocialRouter(controller: SocialController, tokenService: TokenService): Router {
  const router = Router();
  const requireAuth = authenticate(tokenService);

  router.get("/posts/:postId/comments", optionalAuthenticate(tokenService), asyncHandler(controller.comments));
  router.post("/posts/:postId/comments", requireAuth, asyncHandler(controller.createComment));
  router.put("/posts/:postId/likes/me", requireAuth, asyncHandler(controller.like));
  router.delete("/posts/:postId/likes/me", requireAuth, asyncHandler(controller.unlike));
  router.patch("/comments/:commentId", requireAuth, asyncHandler(controller.updateComment));
  router.delete("/comments/:commentId", requireAuth, asyncHandler(controller.removeComment));
  router.put("/users/:userId/followers/me", requireAuth, asyncHandler(controller.follow));
  router.delete("/users/:userId/followers/me", requireAuth, asyncHandler(controller.unfollow));

  return router;
}
