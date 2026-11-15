-- Additive only. All existing JARVIS tables and rows remain unchanged.
-- Drafts reside in the access-protected shared personal workspace, not on a public site.
CREATE TABLE IF NOT EXISTS site_drafts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  brief TEXT NOT NULL,
  style TEXT NOT NULL DEFAULT 'notte',
  contact_email TEXT NOT NULL DEFAULT '',
  html TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS site_drafts_created_idx ON site_drafts(created_at DESC);
