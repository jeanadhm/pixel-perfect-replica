import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { pool, transaction } from "./db";
export async function migrate() {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const dir = new URL("../db/migrations/", import.meta.url);
  for (const name of (await readdir(dir)).filter((n) => n.endsWith(".sql")).sort()) {
    await transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(724116)");
      if ((await client.query("SELECT name FROM migrations WHERE name=$1", [name])).rowCount)
        return;
      await client.query(await readFile(new URL(name, dir), "utf8"));
      await client.query("INSERT INTO migrations(name) VALUES($1)", [name]);
    });
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate()
    .then(() => console.log("Migrations PostgreSQL appliquées."))
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
