import type pg from "pg";
import { AppError } from "../../common/errors/app-error.js";
import type {
  AuthRepository,
  CreateRefreshTokenInput,
  CreateUserInput
} from "./auth.repository.js";
import type {
  AuthUserRecord,
  PasswordResetTokenRecord,
  RefreshTokenRecord
} from "./auth.types.js";

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  slug: string;
  role: "ADMIN" | "MEMBER";
  status: "ACTIVE" | "BLOCKED";
  avatar_key: string | null;
  created_at: Date;
  updated_at: Date;
}

const userColumns = `
  u.id,
  u.email,
  u.password_hash,
  u.full_name,
  u.slug,
  r.name AS role,
  u.status,
  avatar.storage_key AS avatar_key,
  u.created_at,
  u.updated_at
`;

function mapUser(row: UserRow): AuthUserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    slug: row.slug,
    role: row.role,
    status: row.status,
    avatarUrl: row.avatar_key ? `/uploads/${row.avatar_key}` : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function isUniqueViolation(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export class PgAuthRepository implements AuthRepository {
  constructor(private readonly pool: pg.Pool) {}

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT ${userColumns}
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN images avatar ON avatar.id = u.avatar_image_id
       WHERE u.email = $1`,
      [email]
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async findUserById(id: string): Promise<AuthUserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT ${userColumns}
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN images avatar ON avatar.id = u.avatar_image_id
       WHERE u.id = $1`,
      [id]
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async createUser(input: CreateUserInput): Promise<AuthUserRecord> {
    try {
      const result = await this.pool.query<UserRow>(
        `WITH inserted AS (
           INSERT INTO users(role_id, email, password_hash, full_name, slug)
           SELECT r.id, $1, $2, $3, $4
           FROM roles r
           WHERE r.name = $5
           RETURNING *
         )
         SELECT ${userColumns}
         FROM inserted u
         JOIN roles r ON r.id = u.role_id
         LEFT JOIN images avatar ON avatar.id = u.avatar_image_id`,
        [input.email, input.passwordHash, input.fullName, input.slug, input.role]
      );
      const user = result.rows[0];
      if (!user) {
        throw new AppError(500, "ROLE_NOT_CONFIGURED", "Vai trò mặc định chưa được cấu hình.");
      }
      return mapUser(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(409, "EMAIL_OR_SLUG_ALREADY_EXISTS", "Email hoặc đường dẫn hồ sơ đã tồn tại.");
      }
      throw error;
    }
  }

  async updateLastLogin(userId: string, at: Date): Promise<void> {
    await this.pool.query("UPDATE users SET last_login_at = $2 WHERE id = $1", [userId, at]);
  }

  async createRefreshToken(input: CreateRefreshTokenInput): Promise<void> {
    await this.pool.query(
      `INSERT INTO refresh_tokens(
         user_id, family_id, token_hash, jti, user_agent, ip_address, expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        input.userId,
        input.familyId,
        input.tokenHash,
        input.jti,
        input.userAgent ?? null,
        input.ipAddress ?? null,
        input.expiresAt
      ]
    );
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const result = await this.pool.query<UserRow & {
      token_id: string;
      token_user_id: string;
      family_id: string;
      token_hash: string;
      jti: string;
      expires_at: Date;
      revoked_at: Date | null;
    }>(
      `SELECT
         rt.id AS token_id,
         rt.user_id AS token_user_id,
         rt.family_id,
         rt.token_hash,
         rt.jti,
         rt.expires_at,
         rt.revoked_at,
         ${userColumns}
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN images avatar ON avatar.id = u.avatar_image_id
       WHERE rt.token_hash = $1`,
      [tokenHash]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.token_id,
      userId: row.token_user_id,
      familyId: row.family_id,
      tokenHash: row.token_hash,
      jti: row.jti,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
      user: mapUser(row)
    };
  }

  async rotateRefreshToken(currentTokenId: string, input: CreateRefreshTokenInput, at: Date): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const revoked = await client.query(
        `UPDATE refresh_tokens
         SET revoked_at = $2
         WHERE id = $1 AND revoked_at IS NULL
         RETURNING id`,
        [currentTokenId, at]
      );
      if (!revoked.rowCount) {
        throw new AppError(401, "REFRESH_TOKEN_REUSED", "Phiên đã bị thu hồi.");
      }
      await client.query(
        `INSERT INTO refresh_tokens(
           user_id, family_id, token_hash, jti, user_agent, ip_address, expires_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          input.userId,
          input.familyId,
          input.tokenHash,
          input.jti,
          input.userAgent ?? null,
          input.ipAddress ?? null,
          input.expiresAt
        ]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async revokeRefreshTokenByHash(tokenHash: string, at: Date): Promise<void> {
    await this.pool.query(
      "UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, $2) WHERE token_hash = $1",
      [tokenHash, at]
    );
  }

  async revokeRefreshFamily(familyId: string, at: Date): Promise<void> {
    await this.pool.query(
      "UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, $2) WHERE family_id = $1",
      [familyId, at]
    );
  }

  async revokeAllUserTokens(userId: string, at: Date): Promise<void> {
    await this.pool.query(
      "UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, $2) WHERE user_id = $1",
      [userId, at]
    );
  }

  async createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
        [userId]
      );
      await client.query(
        `INSERT INTO password_reset_tokens(user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [userId, tokenHash, expiresAt]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async findPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    const result = await this.pool.query<UserRow & {
      reset_id: string;
      reset_user_id: string;
      token_hash: string;
      expires_at: Date;
      used_at: Date | null;
    }>(
      `SELECT
         prt.id AS reset_id,
         prt.user_id AS reset_user_id,
         prt.token_hash,
         prt.expires_at,
         prt.used_at,
         ${userColumns}
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN images avatar ON avatar.id = u.avatar_image_id
       WHERE prt.token_hash = $1`,
      [tokenHash]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.reset_id,
      userId: row.reset_user_id,
      tokenHash: row.token_hash,
      expiresAt: row.expires_at,
      usedAt: row.used_at,
      user: mapUser(row)
    };
  }

  async completePasswordReset(tokenId: string, userId: string, passwordHash: string, at: Date): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const token = await client.query(
        `UPDATE password_reset_tokens
         SET used_at = $3
         WHERE id = $1 AND user_id = $2 AND used_at IS NULL AND expires_at > $3
         RETURNING id`,
        [tokenId, userId, at]
      );
      if (!token.rowCount) {
        throw new AppError(400, "RESET_TOKEN_INVALID", "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
      }
      await client.query("UPDATE users SET password_hash = $2 WHERE id = $1", [userId, passwordHash]);
      await client.query(
        "UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, $2) WHERE user_id = $1",
        [userId, at]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async changePassword(userId: string, passwordHash: string, at: Date): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE users SET password_hash = $2 WHERE id = $1", [userId, passwordHash]);
      await client.query(
        "UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, $2) WHERE user_id = $1",
        [userId, at]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
