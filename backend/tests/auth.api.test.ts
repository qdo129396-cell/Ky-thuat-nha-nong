import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { AuthController } from "../src/modules/auth/auth.controller.js";
import type {
  AuthRepository,
  CreateRefreshTokenInput,
  CreateUserInput
} from "../src/modules/auth/auth.repository.js";
import { AuthService } from "../src/modules/auth/auth.service.js";
import type {
  AuthUserRecord,
  PasswordResetTokenRecord,
  RefreshTokenRecord
} from "../src/modules/auth/auth.types.js";
import type { MailService, PasswordResetMail } from "../src/services/mail-service.js";
import type { PasswordHasher } from "../src/services/password-hasher.js";
import { TokenService } from "../src/services/token-service.js";

class TestPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> { return `test-hash:${password}`; }
  async verify(passwordHash: string, password: string): Promise<boolean> {
    return passwordHash === `test-hash:${password}`;
  }
}

class RecordingMailService implements MailService {
  messages: PasswordResetMail[] = [];
  async sendPasswordReset(message: PasswordResetMail): Promise<void> { this.messages.push(message); }
}

class MemoryAuthRepository implements AuthRepository {
  users = new Map<string, AuthUserRecord>();
  refreshTokens: RefreshTokenRecord[] = [];
  resetTokens: PasswordResetTokenRecord[] = [];

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }
  async findUserById(id: string): Promise<AuthUserRecord | null> { return this.users.get(id) ?? null; }
  async createUser(input: CreateUserInput): Promise<AuthUserRecord> {
    const now = new Date();
    const user: AuthUserRecord = {
      id: randomUUID(), email: input.email, passwordHash: input.passwordHash,
      fullName: input.fullName, slug: input.slug, role: input.role, status: "ACTIVE",
      avatarUrl: null, createdAt: now, updatedAt: now
    };
    this.users.set(user.id, user);
    return user;
  }
  async updateLastLogin(): Promise<void> {}
  async createRefreshToken(input: CreateRefreshTokenInput): Promise<void> {
    const user = this.users.get(input.userId)!;
    this.refreshTokens.push({
      id: randomUUID(), userId: input.userId, familyId: input.familyId,
      tokenHash: input.tokenHash, jti: input.jti, expiresAt: input.expiresAt,
      revokedAt: null, user
    });
  }
  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.refreshTokens.find((token) => token.tokenHash === tokenHash) ?? null;
  }
  async rotateRefreshToken(currentTokenId: string, input: CreateRefreshTokenInput, at: Date): Promise<void> {
    const current = this.refreshTokens.find((token) => token.id === currentTokenId);
    if (!current || current.revokedAt) throw new Error("Token already revoked");
    current.revokedAt = at;
    await this.createRefreshToken(input);
  }
  async revokeRefreshTokenByHash(tokenHash: string, at: Date): Promise<void> {
    const token = this.refreshTokens.find((item) => item.tokenHash === tokenHash);
    if (token && !token.revokedAt) token.revokedAt = at;
  }
  async revokeRefreshFamily(familyId: string, at: Date): Promise<void> {
    this.refreshTokens.filter((token) => token.familyId === familyId).forEach((token) => { token.revokedAt ??= at; });
  }
  async revokeAllUserTokens(userId: string, at: Date): Promise<void> {
    this.refreshTokens.filter((token) => token.userId === userId).forEach((token) => { token.revokedAt ??= at; });
  }
  async createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    this.resetTokens.filter((token) => token.userId === userId && !token.usedAt)
      .forEach((token) => { token.usedAt = new Date(); });
    this.resetTokens.push({
      id: randomUUID(), userId, tokenHash, expiresAt, usedAt: null, user: this.users.get(userId)!
    });
  }
  async findPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    return this.resetTokens.find((token) => token.tokenHash === tokenHash) ?? null;
  }
  async completePasswordReset(tokenId: string, userId: string, passwordHash: string, at: Date): Promise<void> {
    const token = this.resetTokens.find((item) => item.id === tokenId)!;
    token.usedAt = at;
    this.users.get(userId)!.passwordHash = passwordHash;
    await this.revokeAllUserTokens(userId, at);
  }
  async changePassword(userId: string, passwordHash: string, at: Date): Promise<void> {
    this.users.get(userId)!.passwordHash = passwordHash;
    await this.revokeAllUserTokens(userId, at);
  }
}

function cookieValue(setCookie: string | string[] | undefined): string {
  const value = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return value?.split(";")[0] ?? "";
}

describe("Authentication REST API", () => {
  let repository: MemoryAuthRepository;
  let mailer: RecordingMailService;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    repository = new MemoryAuthRepository();
    mailer = new RecordingMailService();
    const tokenService = new TokenService("test-secret-with-at-least-thirty-two-characters", "15m");
    const service = new AuthService(repository, new TestPasswordHasher(), tokenService, mailer, {
      frontendUrl: "http://localhost:5173", refreshTokenTtlDays: 30, resetTokenTtlMinutes: 30
    });
    app = createApp({
      authController: new AuthController(service, false, 30),
      tokenService,
      frontendUrl: "http://localhost:5173",
      nodeEnv: "test"
    });
  });

  async function registerAndLogin() {
    await request(app).post("/api/v1/auth/register").send({
      fullName: "Nguyễn Văn An", email: "an@example.com", password: "Matkhau123"
    }).expect(201);
    return request(app).post("/api/v1/auth/login").send({
      email: "an@example.com", password: "Matkhau123"
    }).expect(200);
  }

  it("trả health response theo JSON contract", async () => {
    const response = await request(app).get("/api/v1/health").expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
    expect(response.headers["x-request-id"]).toBeTruthy();
  });

  it("đăng ký, chuẩn hóa email và không lộ password hash", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({
      fullName: "Nguyễn Văn An", email: "  AN@EXAMPLE.COM ", password: "Matkhau123"
    }).expect(201);
    expect(response.body.data.user.email).toBe("an@example.com");
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(repository.users.size).toBe(1);
  });

  it("trả lỗi validation chuẩn", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({
      fullName: "A", email: "sai-email", password: "123"
    }).expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details.length).toBeGreaterThan(1);
  });

  it("đăng nhập, truy cập /me và đặt refresh cookie HttpOnly", async () => {
    const login = await registerAndLogin();
    expect(login.body.data.accessToken).toBeTruthy();
    const setCookieHeaders = login.headers["set-cookie"] as unknown as string[];
    expect(setCookieHeaders.at(0)).toContain("HttpOnly");
    const me = await request(app).get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${login.body.data.accessToken}`).expect(200);
    expect(me.body.data.user.email).toBe("an@example.com");
  });

  it("xoay refresh token và phát hiện token cũ bị dùng lại", async () => {
    const login = await registerAndLogin();
    const oldCookie = cookieValue(login.headers["set-cookie"]);
    const refreshed = await request(app).post("/api/v1/auth/refresh").set("Cookie", oldCookie).expect(200);
    const newCookie = cookieValue(refreshed.headers["set-cookie"]);
    expect(newCookie).not.toBe(oldCookie);
    const reused = await request(app).post("/api/v1/auth/refresh").set("Cookie", oldCookie).expect(401);
    expect(reused.body.error.code).toBe("REFRESH_TOKEN_REUSED");
    await request(app).post("/api/v1/auth/refresh").set("Cookie", newCookie).expect(401);
  });

  it("forgot-password không tiết lộ email và reset thu hồi phiên cũ", async () => {
    const login = await registerAndLogin();
    await request(app).post("/api/v1/auth/forgot-password").send({ email: "an@example.com" }).expect(200);
    expect(mailer.messages).toHaveLength(1);
    const resetUrl = new URL(mailer.messages[0]!.resetUrl);
    const token = resetUrl.searchParams.get("token");
    expect(token).toBeTruthy();
    await request(app).post("/api/v1/auth/reset-password").send({
      token, newPassword: "Matkhau456"
    }).expect(200);
    await request(app).post("/api/v1/auth/login").send({
      email: "an@example.com", password: "Matkhau123"
    }).expect(401);
    await request(app).post("/api/v1/auth/login").send({
      email: "an@example.com", password: "Matkhau456"
    }).expect(200);
    const oldCookie = cookieValue(login.headers["set-cookie"]);
    await request(app).post("/api/v1/auth/refresh").set("Cookie", oldCookie).expect(401);
  });
});
