import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "../config/env.js";
import { createPool } from "./pool.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(currentDir, "../../database/migrations");

async function migrate(): Promise<void> {
  const env = loadEnv();
  const pool = createPool(env.DATABASE_URL);
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name varchar(255) PRIMARY KEY,
        checksum varchar(64) NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    const files = (await readdir(migrationsDir))
      .filter((name) => name.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const sql = await readFile(path.join(migrationsDir, file), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const applied = await client.query<{ checksum: string }>(
        "SELECT checksum FROM schema_migrations WHERE name = $1",
        [file]
      );

      if (applied.rowCount) {
        if (applied.rows[0]?.checksum !== checksum) {
          throw new Error(`Migration đã áp dụng bị thay đổi: ${file}`);
        }
        console.log(`Bỏ qua migration đã áp dụng: ${file}`);
        continue;
      }

      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations(name, checksum) VALUES ($1, $2)",
        [file, checksum]
      );
      console.log(`Đã áp dụng migration: ${file}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

await migrate();

