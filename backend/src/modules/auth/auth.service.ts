import { randomUUID } from "node:crypto";
import { AppError } from "../../common/errors/app-error.js";
import { createOpaqueToken, hashToken, normalizeEmail, toSlug } from "../../common/utils.js";
import type { MailService } from "../../services/mail-service.js";
import type { PasswordHasher } from "../../services/password-hasher.js";
import { TokenService } from "../../services/token-service.js";
import type { AuthRepository, CreateRefreshTokenInput } from "./auth.repository.js";
import type { ClientContext, PublicAuthUser } from "./auth.types.js";
import { toPublicAuthUser } from "./auth.types.js";

export interface AuthServiceConfig {
  frontendUrl: string;
  refreshTokenTtlDays: number;
  resetTokenTtlMinutes: number;
}

export interface SessionResult {
  accessToken: string;
  refreshToken: string;
  user: PublicAuthUser;
}

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly mailService: MailService,
    private readonly config: AuthServiceConfig
  ) {}

  async register(input: { email: string; password: string; fullName: string }): Promise<PublicAuthUser> {
    const email = normalizeEmail(input.email);
    if (await this.repository.findUserByEmail(email)) {
      throw new AppError(409, "EMAIL_ALREADY_EXISTS", "Email đã được sử dụng.");
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const slugBase = toSlug(input.fullName) || "nha-nong";
    const slug = `${slugBase}-${randomUUID().slice(0, 8)}`;
    const user = await this.repository.createUser({
      email,
      passwordHash,
      fullName: input.fullName.trim(),
      slug,
      role: "MEMBER"
    });
    return toPublicAuthUser(user);
  }

  async login(
    input: { email: string; password: string },
    context: ClientContext
  ): Promise<SessionResult> {
    const user = await this.repository.findUserByEmail(normalizeEmail(input.email));
    const validPassword = user
      ? await this.passwordHasher.verify(user.passwordHash, input.password)
      : false;

    if (!user || !validPassword) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không chính xác.");
    }
    this.assertActive(user.status);

    const session = await this.createSession(user.id, user.role, context);
    await this.repository.updateLastLogin(user.id, new Date());
    return { ...session, user: toPublicAuthUser(user) };
  }

  async refresh(rawRefreshToken: string | undefined, context: ClientContext): Promise<SessionResult> {
    if (!rawRefreshToken) {
      throw new AppError(401, "REFRESH_TOKEN_REQUIRED", "Không tìm thấy phiên làm mới.");
    }

    const now = new Date();
    const record = await this.repository.findRefreshTokenByHash(hashToken(rawRefreshToken));
    if (!record) {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Phiên làm mới không hợp lệ.");
    }
    if (record.revokedAt) {
      await this.repository.revokeRefreshFamily(record.familyId, now);
      throw new AppError(401, "REFRESH_TOKEN_REUSED", "Phát hiện phiên đã bị thu hồi.");
    }
    if (record.expiresAt <= now) {
      await this.repository.revokeRefreshTokenByHash(record.tokenHash, now);
      throw new AppError(401, "REFRESH_TOKEN_EXPIRED", "Phiên đăng nhập đã hết hạn.");
    }
    if (record.user.status !== "ACTIVE") {
      await this.repository.revokeAllUserTokens(record.userId, now);
      throw new AppError(403, "ACCOUNT_BLOCKED", "Tài khoản đã bị khóa.");
    }

    const access = await this.tokenService.createAccessToken(record.user.id, record.user.role);
    const nextRefreshToken = createOpaqueToken();
    const nextRecord = this.createRefreshTokenInput(
      record.userId,
      record.familyId,
      nextRefreshToken,
      context
    );
    await this.repository.rotateRefreshToken(record.id, nextRecord, now);

    return {
      accessToken: access.token,
      refreshToken: nextRefreshToken,
      user: toPublicAuthUser(record.user)
    };
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (rawRefreshToken) {
      await this.repository.revokeRefreshTokenByHash(hashToken(rawRefreshToken), new Date());
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.repository.revokeAllUserTokens(userId, new Date());
  }

  async forgotPassword(emailInput: string): Promise<void> {
    const user = await this.repository.findUserByEmail(normalizeEmail(emailInput));
    if (!user || user.status !== "ACTIVE") return;

    const rawToken = createOpaqueToken();
    const expiresAt = new Date(Date.now() + this.config.resetTokenTtlMinutes * 60_000);
    await this.repository.createPasswordResetToken(user.id, hashToken(rawToken), expiresAt);
    const resetUrl = `${this.config.frontendUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
    await this.mailService.sendPasswordReset({
      recipient: user.email,
      fullName: user.fullName,
      resetUrl,
      expiresInMinutes: this.config.resetTokenTtlMinutes
    });
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const now = new Date();
    const record = await this.repository.findPasswordResetTokenByHash(hashToken(rawToken));
    if (!record || record.usedAt || record.expiresAt <= now) {
      throw new AppError(400, "RESET_TOKEN_INVALID", "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
    }
    this.assertActive(record.user.status);
    const passwordHash = await this.passwordHasher.hash(newPassword);
    await this.repository.completePasswordReset(record.id, record.userId, passwordHash, now);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.repository.findUserById(userId);
    if (!user) throw new AppError(404, "USER_NOT_FOUND", "Không tìm thấy người dùng.");
    this.assertActive(user.status);
    if (!(await this.passwordHasher.verify(user.passwordHash, currentPassword))) {
      throw new AppError(400, "CURRENT_PASSWORD_INCORRECT", "Mật khẩu hiện tại không chính xác.");
    }
    if (await this.passwordHasher.verify(user.passwordHash, newPassword)) {
      throw new AppError(422, "PASSWORD_NOT_CHANGED", "Mật khẩu mới phải khác mật khẩu hiện tại.");
    }
    await this.repository.changePassword(userId, await this.passwordHasher.hash(newPassword), new Date());
  }

  async getMe(userId: string): Promise<PublicAuthUser> {
    const user = await this.repository.findUserById(userId);
    if (!user) throw new AppError(404, "USER_NOT_FOUND", "Không tìm thấy người dùng.");
    this.assertActive(user.status);
    return toPublicAuthUser(user);
  }

  private async createSession(
    userId: string,
    role: "ADMIN" | "MEMBER",
    context: ClientContext
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const familyId = randomUUID();
    const rawRefreshToken = createOpaqueToken();
    const access = await this.tokenService.createAccessToken(userId, role);
    await this.repository.createRefreshToken(
      this.createRefreshTokenInput(userId, familyId, rawRefreshToken, context)
    );
    return { accessToken: access.token, refreshToken: rawRefreshToken };
  }

  private createRefreshTokenInput(
    userId: string,
    familyId: string,
    rawToken: string,
    context: ClientContext
  ): CreateRefreshTokenInput {
    return {
      userId,
      familyId,
      tokenHash: hashToken(rawToken),
      jti: randomUUID(),
      expiresAt: new Date(Date.now() + this.config.refreshTokenTtlDays * 86_400_000),
      ...(context.userAgent ? { userAgent: context.userAgent.slice(0, 500) } : {}),
      ...(context.ipAddress ? { ipAddress: context.ipAddress.slice(0, 45) } : {})
    };
  }

  private assertActive(status: "ACTIVE" | "BLOCKED"): void {
    if (status !== "ACTIVE") {
      throw new AppError(403, "ACCOUNT_BLOCKED", "Tài khoản đã bị khóa.");
    }
  }
}

