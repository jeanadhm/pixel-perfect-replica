CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY, email text NOT NULL UNIQUE, name text NOT NULL,
 password_hash text NOT NULL, role text NOT NULL CHECK(role IN ('admin','editor','viewer')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sites (id text PRIMARY KEY, name text NOT NULL, url text NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS workspace_revision (id integer PRIMARY KEY CHECK(id=1), revision integer NOT NULL DEFAULT 0);
INSERT INTO workspace_revision(id) VALUES(1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS records (
 collection text NOT NULL CHECK(collection IN ('keywords','prompts','geoTests','actions','pages','leads','audits','backlinks','competitors')),
 id text NOT NULL, site_id text REFERENCES sites(id), payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
 origin text NOT NULL DEFAULT 'manual' CHECK(origin IN ('manual','reference','public_html','gsc','csv','webhook')),
 source_url text, observed_at timestamptz, updated_by uuid REFERENCES users(id), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(collection,id)
);
CREATE INDEX IF NOT EXISTS records_site_collection ON records(site_id,collection);
CREATE TABLE IF NOT EXISTS families (name text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS change_log (
 id bigserial PRIMARY KEY, user_id uuid REFERENCES users(id), collection text NOT NULL, record_id text,
 operation text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS google_tokens (
 id integer PRIMARY KEY CHECK(id=1), encrypted_token text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS oauth_states (
 state_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 verifier text NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS integrations (
 site_id text PRIMARY KEY REFERENCES sites(id), gsc_property text, ga4_property text,
 gsc_synced_at timestamptz, ga4_synced_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sync_runs (
 id uuid PRIMARY KEY, site_id text NOT NULL REFERENCES sites(id), provider text NOT NULL CHECK(provider IN ('gsc','ga4','crawl','leads')),
 status text NOT NULL CHECK(status IN ('running','success','error')), started_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz, start_date date, end_date date, row_count integer NOT NULL DEFAULT 0, message text
);
CREATE UNIQUE INDEX IF NOT EXISTS sync_one_running ON sync_runs(site_id,provider) WHERE status='running';
CREATE TABLE IF NOT EXISTS search_daily (
 site_id text NOT NULL REFERENCES sites(id), day date NOT NULL, clicks numeric NOT NULL CHECK(clicks>=0),
 impressions numeric NOT NULL CHECK(impressions>=0), position numeric NOT NULL,
 source_property text NOT NULL, fetched_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(site_id,day)
);
CREATE TABLE IF NOT EXISTS analytics_daily (
 site_id text NOT NULL REFERENCES sites(id), day date NOT NULL, source text NOT NULL, medium text NOT NULL,
 sessions numeric NOT NULL CHECK(sessions>=0), engaged_sessions numeric NOT NULL CHECK(engaged_sessions>=0),
 key_events numeric NOT NULL CHECK(key_events>=0), source_property text NOT NULL,
 fetched_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(site_id,day,source,medium)
);
CREATE TABLE IF NOT EXISTS public_observations (
 url text PRIMARY KEY, site_id text NOT NULL REFERENCES sites(id), observed_at timestamptz NOT NULL,
 payload jsonb NOT NULL, origin text NOT NULL DEFAULT 'public_html'
);
