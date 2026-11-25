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
  // Public monitoring must not depend on a Google OAuth connection being enabled.
  autoMonitoringEnabled: process.env["AUTO_MONITORING_ENABLED"] !== "false",
  autoMonitoringIntervalMinutes: Math.min(
    24 * 60,
    Math.max(30, Number(process.env["AUTO_MONITORING_INTERVAL_MINUTES"] ?? 720) || 720),
  ),
  autoCrawlIntervalHours: Math.min(
    168,
    Math.max(12, Number(process.env["AUTO_CRAWL_INTERVAL_HOURS"] ?? 24) || 24),
  ),
  // Competitive discovery is enabled only when a DataForSEO account is present.
  // It runs weekly by default because each discovery consumes provider credits.
  autoCompetitorDiscoveryEnabled: process.env["AUTO_COMPETITOR_DISCOVERY_ENABLED"] !== "false",
  autoCompetitorDiscoveryIntervalHours: Math.min(
    24 * 30,
    Math.max(24, Number(process.env["AUTO_COMPETITOR_DISCOVERY_INTERVAL_HOURS"] ?? 168) || 168),
  ),
  // Kept exclusively on the server. DataForSEO uses HTTP Basic authentication;
  // never expose either value through a VITE_/NEXT_PUBLIC_ variable.
  dataForSeoLogin: process.env["DATAFORSEO_LOGIN"] ?? "",
  dataForSeoPassword: process.env["DATAFORSEO_PASSWORD"] ?? "",
  // JSON kept server-side only. Example:
  // {"ambs":{"url":"https://ambs-agency.com/api/analytics/export/events","token":"..."}}
  siteEventExports: process.env["SITE_EVENT_EXPORTS"] ?? "",
  autoEventSyncEnabled: process.env["AUTO_EVENT_SYNC_ENABLED"] !== "false",
  autoEventSyncIntervalMinutes: Math.min(
    24 * 60,
    Math.max(15, Number(process.env["AUTO_EVENT_SYNC_INTERVAL_MINUTES"] ?? 15) || 15),
  ),
};
