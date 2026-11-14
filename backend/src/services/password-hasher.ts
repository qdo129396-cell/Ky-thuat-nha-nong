import { Algorithm, hash, verify } from "@node-rs/argon2";

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(passwordHash: string, password: string): Promise<boolean>;
}

export class ArgonPasswordHasher implements PasswordHasher {
  constructor(private readonly pepper = "") {}

  hash(password: string): Promise<string> {
    return hash(`${password}${this.pepper}`, {
      algorithm: Algorithm.Argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
      outputLen: 32
    });
  }

  verify(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, `${password}${this.pepper}`);
  }
}

