import type { Logger } from "pino";

declare global {
  namespace Express {
    interface Request {
      id: string;
      log?: Logger;
      auth?: {
        userId: string;
        role: "ADMIN" | "MEMBER";
        jti: string;
      };
    }
  }
}

export {};

