CREATE TABLE IF NOT EXISTS competitor_observations (
 id bigserial PRIMARY KEY,
 competitor_id text NOT NULL,
 checked_at timestamptz NOT NULL DEFAULT now(),
 url text NOT NULL,
 final_url text,
 status integer,
 title text,
 meta_description text,
 robots text,
 h1 text,
 h2_count integer,
 schema_blocks integer,
 word_count integer,
 error text
);
CREATE INDEX IF NOT EXISTS competitor_observations_latest
 ON competitor_observations(competitor_id, checked_at DESC);
