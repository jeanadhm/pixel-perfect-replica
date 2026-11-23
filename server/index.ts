import { createApp } from "./app";
import { config } from "./config";
import { pool } from "./db";
import { migrate } from "./migrate";
import { seed } from "./seed";
import { autoSyncGoogle } from "./google";
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
let automation: ReturnType<typeof setInterval> | undefined;
if (config.autoSyncEnabled) {
  let syncing = false;
  const runAutomation = async () => {
    if (syncing) return;
    syncing = true;
    try {
      const result = await autoSyncGoogle();
      if (result.completed || result.failed)
        console.log(`Synchronisation Google auto : ${result.completed} réussie(s), ${result.failed} échec(s).`);
    } catch {
      // Each provider failure is persisted in sync_runs. The process must remain available.
      console.error("Synchronisation Google automatique non exécutée.");
    } finally {
      syncing = false;
    }
  };
  const initial = setTimeout(() => void runAutomation(), 15000);
  initial.unref();
  automation = setInterval(
    () => void runAutomation(),
    config.autoSyncIntervalMinutes * 60 * 1000,
  );
  automation.unref();
}
async function stop() {
  if (automation) clearInterval(automation);
  server.close();
  await pool.end();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
