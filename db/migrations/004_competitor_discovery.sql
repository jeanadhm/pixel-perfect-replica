-- Competitor intelligence is stored in the existing records payload so the
-- discovery source and public inventory remain attached to each domain.
-- This migration reserves an explicit audit marker for installations upgraded
-- from the manual competitor list.
CREATE TABLE IF NOT EXISTS competitor_discovery_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  discovered_count integer NOT NULL DEFAULT 0,
  enriched_count integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'dataforseo_labs',
  error text
);
