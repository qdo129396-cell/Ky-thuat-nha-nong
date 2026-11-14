import { randomUUID } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { AppError } from "../common/errors/app-error.js";

export type RoleName = "ADMIN" | "MEMBER";

export interface AccessTokenPayload {
  userId: string;
  role: RoleName;
  jti: string;
}

export class TokenService {
  private readonly secret: Uint8Array;

  constructor(secret: string, private readonly expiresIn: string) {
    this.secret = new TextEncoder().encode(secret);
  }

  async createAccessToken(userId: string, role: RoleName): Promise<{ token: string; jti: string }> {
    const jti = randomUUID();
    const token = await new SignJWT({ role })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(userId)
      .setJti(jti)
      .setIssuedAt()
      .setExpirationTime(this.expiresIn)
      .sign(this.secret);
    return { token, jti };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const { payload } = await jwtVerify(token, this.secret, { algorithms: ["HS256"] });
      if (!payload.sub || !payload.jti || (payload.role !== "ADMIN" && payload.role !== "MEMBER")) {
        throw new Error("Invalid claims");
      }
      return { userId: payload.sub, role: payload.role, jti: payload.jti };
    } catch {
      throw new AppError(401, "INVALID_ACCESS_TOKEN", "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
    }
  }
}

