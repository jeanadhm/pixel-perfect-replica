-- Agrégats de conversions reçus depuis les sites AMBS. Cette table ne contient
-- jamais d'adresse e-mail, de téléphone ou d'identifiant visiteur.
CREATE TABLE IF NOT EXISTS site_event_daily (
  site_id text NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  day date NOT NULL,
  name text NOT NULL,
  path text NOT NULL,
  label text NOT NULL DEFAULT '',
  destination text NOT NULL DEFAULT '',
  events numeric NOT NULL CHECK(events >= 0),
  unique_visitors numeric NOT NULL CHECK(unique_visitors >= 0),
  source_url text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (site_id, day, name, path, label, destination)
);

CREATE INDEX IF NOT EXISTS site_event_daily_site_day ON site_event_daily(site_id, day DESC);
