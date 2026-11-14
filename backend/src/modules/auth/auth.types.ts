import type { RoleName } from "../../services/token-service.js";

export type UserStatus = "ACTIVE" | "BLOCKED";

export interface AuthUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  slug: string;
  role: RoleName;
  status: UserStatus;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicAuthUser {
  id: string;
  email: string;
  fullName: string;
  slug: string;
  role: RoleName;
  status: UserStatus;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  jti: string;
  expiresAt: Date;
  revokedAt: Date | null;
  user: AuthUserRecord;
}

export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  user: AuthUserRecord;
}

export interface ClientContext {
  userAgent?: string;
  ipAddress?: string;
}

export function toPublicAuthUser(user: AuthUserRecord): PublicAuthUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    slug: user.slug,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

