import { randomUUID } from "node:crypto";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { errorHandler, notFoundHandler } from "./common/middleware/error-handler.js";
import type { AuthController } from "./modules/auth/auth.controller.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { createPostRouter } from "./modules/posts/post.routes.js";
import type { SocialController } from "./modules/social/social.controller.js";
import { createSocialRouter } from "./modules/social/social.routes.js";
import type { TokenService } from "./services/token-service.js";
import type { PostController } from "./modules/posts/post.controller.js";

export interface CreateAppOptions {
  authController?: AuthController;
  postController?: PostController;
  socialController?: SocialController;
  tokenService: TokenService;
  frontendUrl: string;
  nodeEnv: "development" | "test" | "production";
  staticFilesDir?: string;
}

export function createApp(options: CreateAppOptions): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    pinoHttp({
      enabled: options.nodeEnv !== "test",
      genReqId: (request, response) => {
        const incomingId = request.headers["x-request-id"];
        const id = typeof incomingId === "string" ? incomingId.slice(0, 100) : randomUUID();
        response.setHeader("x-request-id", id);
        return id;
      },
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.body.password",
        "req.body.currentPassword",
        "req.body.newPassword",
        "req.body.token"
      ]
    })
  );
  app.use(helmet());
  app.use(
    cors({
      origin: options.frontendUrl,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  app.use(cookieParser());

  app.get("/api/v1/health", (request, response) => {
    response.json({
      success: true,
      data: { status: "ok", timestamp: new Date().toISOString() },
      requestId: request.id
    });
  });
  if (options.authController) {
    app.use("/api/v1/auth", createAuthRouter(options.authController, options.tokenService));
  }
  if (options.socialController) {
    app.use("/api/v1", createSocialRouter(options.socialController, options.tokenService));
  }
  if (options.postController) {
    app.use("/api/v1", createPostRouter(options.postController, options.tokenService));
  }

  if (options.staticFilesDir) {
    app.use(express.static(options.staticFilesDir));
    app.get(/^(?!\/api(?:\/|$)).*$/, (_request, response, next) => {
      response.sendFile("index.html", { root: options.staticFilesDir }, (error) => {
        if (error) next(error);
      });
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
