import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  COOKIE_SECURE: z.enum(["true", "false"]).optional().transform((value) => value === "true"),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().min(5).max(120).default(30),
  PASSWORD_PEPPER: z.string().default(""),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(12).max(128).optional(),
  ADMIN_FULL_NAME: z.string().min(2).max(100).default("Quản trị viên")
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Cấu hình môi trường không hợp lệ: ${issues}`);
  }
  return result.data;
}
