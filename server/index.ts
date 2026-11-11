import { createApp } from "./app";
import { config } from "./config";
import { pool } from "./db";
import { migrate } from "./migrate";
import { seed } from "./seed";
if (!config.databaseUrl)
  throw new Error("DATABASE_URL manquant. Exécuter npm run db:local ou configurer .env.");
await migrate();
await seed();
// An interrupted process cannot retain an indefinite running job.
await pool.query(
  "UPDATE sync_runs SET status='error',finished_at=now(),message='Processus interrompu avant confirmation.' WHERE status='running' AND started_at<now()-interval '15 minutes'",
);
const server = createApp().listen(config.port, config.host, () =>
  console.log(`API AMBS : http://${config.host}:${config.port} · PostgreSQL connecté`),
);
async function stop() {
  server.close();
  await pool.end();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
