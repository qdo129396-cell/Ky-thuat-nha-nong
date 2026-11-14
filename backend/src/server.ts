import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { createPool } from "./database/pool.js";
import { AuthController } from "./modules/auth/auth.controller.js";
import { PgAuthRepository } from "./modules/auth/pg-auth.repository.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { PostController } from "./modules/posts/post.controller.js";
import { PgPostRepository } from "./modules/posts/pg-post.repository.js";
import { PostService } from "./modules/posts/post.service.js";
import { PgSocialRepository } from "./modules/social/pg-social.repository.js";
import { SocialController } from "./modules/social/social.controller.js";
import { SocialService } from "./modules/social/social.service.js";
import { DevelopmentMailService } from "./services/mail-service.js";
import { ArgonPasswordHasher } from "./services/password-hasher.js";
import { TokenService } from "./services/token-service.js";

const env = loadEnv();
const pool = createPool(env.DATABASE_URL);
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const staticFilesDir = path.resolve(currentDir, "../../frontend/dist");
const repository = new PgAuthRepository(pool);
const tokenService = new TokenService(env.JWT_ACCESS_SECRET, env.JWT_ACCESS_EXPIRES_IN);
const authService = new AuthService(
  repository,
  new ArgonPasswordHasher(env.PASSWORD_PEPPER),
  tokenService,
  new DevelopmentMailService(),
  {
    frontendUrl: env.FRONTEND_URL,
    refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
    resetTokenTtlMinutes: env.RESET_TOKEN_TTL_MINUTES
  }
);
const authController = new AuthController(
  authService,
  env.COOKIE_SECURE,
  env.REFRESH_TOKEN_TTL_DAYS
);
const postRepository = new PgPostRepository(pool);
const socialRepository = new PgSocialRepository(pool);
const postController = new PostController(new PostService(postRepository, socialRepository));
const socialController = new SocialController(new SocialService(socialRepository));
const app = createApp({
  authController,
  postController,
  socialController,
  tokenService,
  frontendUrl: env.FRONTEND_URL,
  nodeEnv: env.NODE_ENV,
  ...(env.NODE_ENV === "production" && existsSync(staticFilesDir) ? { staticFilesDir } : {})
});

const server = app.listen(env.PORT, () => {
  console.log(`API đang chạy tại http://localhost:${env.PORT}/api/v1`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`Nhận ${signal}, đang dừng server...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
