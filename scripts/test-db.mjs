import "dotenv/config";
import pg from "pg";
const url = new URL(process.env.DATABASE_URL);
url.pathname = "/postgres";
const pool = new pg.Pool({ connectionString: url.toString() });
try {
  if (!(await pool.query("SELECT 1 FROM pg_database WHERE datname='ambs_hub_test'")).rowCount)
    await pool.query("CREATE DATABASE ambs_hub_test");
  console.log("Base de tests isolée prête.");
} finally {
  await pool.end();
}
