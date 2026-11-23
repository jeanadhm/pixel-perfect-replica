import "dotenv/config";
export const config = {
  databaseUrl: process.env["DATABASE_URL"] ?? "",
  appOrigin: process.env["APP_ORIGIN"] ?? "http://localhost:3000",
  port: Number(process.env["API_PORT"] ?? 4000),
  host: process.env["API_HOST"] ?? "127.0.0.1",
  production: process.env["NODE_ENV"] === "production",
  encryptionKey: process.env["TOKEN_ENCRYPTION_KEY"] ?? "",
  googleClientId: process.env["GOOGLE_CLIENT_ID"] ?? "",
  googleClientSecret: process.env["GOOGLE_CLIENT_SECRET"] ?? "",
  googleRedirectUri:
    process.env["GOOGLE_REDIRECT_URI"] ?? "http://localhost:3000/api/google/callback",
  // Kept server-side: this is a single-replica Dokploy service, not a browser timer.
  autoSyncEnabled: process.env["AUTO_SYNC_ENABLED"] !== "false",
  autoSyncIntervalMinutes: Math.min(
    24 * 60,
    Math.max(30, Number(process.env["AUTO_SYNC_INTERVAL_MINUTES"] ?? 240) || 240),
  ),
};
