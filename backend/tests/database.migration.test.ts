import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.resolve(currentDir, "../database/migrations/001_initial_schema.sql");
const seedPath = path.resolve(currentDir, "../database/seeds/001_core.sql");

describe("PostgreSQL initial migration", () => {
  let database: PGlite;

  beforeEach(async () => {
    database = new PGlite();
    await database.exec(await readFile(migrationPath, "utf8"));
    await database.exec(await readFile(seedPath, "utf8"));
  });

  afterEach(async () => database.close());

  it("tạo đủ bảng và các cột nền bắt buộc", async () => {
    const expectedTables = [
      "audit_logs", "categories", "comments", "followers", "images", "likes",
      "notifications", "password_reset_tokens", "posts", "refresh_tokens", "roles", "users"
    ];
    const tables = await database.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    expect(tables.rows.map((row) => row.table_name)).toEqual(expectedTables);

    const baseColumns = await database.query<{ table_name: string; column_name: string }>(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name IN ('id', 'created_at', 'updated_at')
    `);
    for (const table of expectedTables) {
      const columns = baseColumns.rows.filter((row) => row.table_name === table).map((row) => row.column_name);
      expect(columns).toEqual(expect.arrayContaining(["id", "created_at", "updated_at"]));
    }
  });

  it("seed role và category có tính idempotent", async () => {
    await database.exec(await readFile(seedPath, "utf8"));
    const roles = await database.query<{ name: string }>("SELECT name FROM roles ORDER BY name");
    const categories = await database.query<{ count: number }>("SELECT count(*)::int AS count FROM categories");
    expect(roles.rows.map((row) => row.name)).toEqual(["ADMIN", "MEMBER"]);
    expect(categories.rows[0]?.count).toBe(6);
  });

  it("chặn email không phân biệt hoa thường ở tầng database", async () => {
    await database.query(
      `INSERT INTO users(role_id, email, password_hash, full_name, slug)
       SELECT id, $1, 'hash', 'Nhà nông A', 'nha-nong-a' FROM roles WHERE name = 'MEMBER'`,
      ["user@example.com"]
    );
    await expect(database.query(
      `INSERT INTO users(role_id, email, password_hash, full_name, slug)
       SELECT id, $1, 'hash', 'Nhà nông B', 'nha-nong-b' FROM roles WHERE name = 'MEMBER'`,
      ["USER@EXAMPLE.COM"]
    )).rejects.toThrow();
  });
});

