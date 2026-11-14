import type {
  AuthUserRecord,
  ClientContext,
  PasswordResetTokenRecord,
  RefreshTokenRecord
} from "./auth.types.js";
import type { RoleName } from "../../services/token-service.js";

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  fullName: string;
  slug: string;
  role: RoleName;
}

export interface CreateRefreshTokenInput extends ClientContext {
  userId: string;
  familyId: string;
  tokenHash: string;
  jti: string;
  expiresAt: Date;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  findUserById(id: string): Promise<AuthUserRecord | null>;
  createUser(input: CreateUserInput): Promise<AuthUserRecord>;
  updateLastLogin(userId: string, at: Date): Promise<void>;

  createRefreshToken(input: CreateRefreshTokenInput): Promise<void>;
  findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  rotateRefreshToken(currentTokenId: string, input: CreateRefreshTokenInput, at: Date): Promise<void>;
  revokeRefreshTokenByHash(tokenHash: string, at: Date): Promise<void>;
  revokeRefreshFamily(familyId: string, at: Date): Promise<void>;
  revokeAllUserTokens(userId: string, at: Date): Promise<void>;

  createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetTokenRecord | null>;
  completePasswordReset(tokenId: string, userId: string, passwordHash: string, at: Date): Promise<void>;
  changePassword(userId: string, passwordHash: string, at: Date): Promise<void>;
}

