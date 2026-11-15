-- Additive persistent execution jobs. No public deployment or automatic scheduled execution.
CREATE TABLE IF NOT EXISTS site_jobs (
  id TEXT PRIMARY KEY,
  brief TEXT NOT NULL,
  style TEXT NOT NULL DEFAULT 'notte',
  contact_email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0 AND attempt_count <= 3),
  lease_token TEXT,
  draft_id TEXT,
  error_text TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(draft_id) REFERENCES site_drafts(id)
);
CREATE INDEX IF NOT EXISTS site_jobs_recent_idx ON site_jobs(created_at DESC);
