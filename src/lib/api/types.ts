import type { PUBLIC_PAGES } from "../demo/public-pages";
export interface Member {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
}
export interface Integration {
  site_id: string;
  gsc_property: string | null;
  ga4_property: string | null;
  gsc_synced_at: string | null;
  ga4_synced_at: string | null;
}
export interface SyncRun {
  id: string;
  site_id: string;
  provider: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  start_date: string;
  end_date: string;
  row_count: number;
  message: string | null;
}
export interface Connections {
  googleConfigured: boolean;
  googleConnected: boolean;
  sites: Integration[];
  runs: SyncRun[];
}
export type PublicObservation = (typeof PUBLIC_PAGES)[number] & { checkedAt: string };
export interface Metrics {
  siteIds?: string[];
  startDate: string;
  endDate: string;
  search: {
    site_id: string;
    day: string;
    clicks: number;
    impressions: number;
    position: number;
    source_property: string;
    fetched_at: string;
  }[];
  analytics: {
    site_id: string;
    day: string;
    source: string;
    medium: string;
    sessions: number;
    engaged_sessions: number;
    key_events: number;
    source_property: string;
    fetched_at: string;
  }[];
  runs: {
    site_id: string;
    provider: string;
    start_date: string;
    end_date: string;
    finished_at: string;
    message: string;
  }[];
}
