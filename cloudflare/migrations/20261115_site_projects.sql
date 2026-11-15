-- JARVIS multipage projects: additive only; do not run on production without backup/review.
CREATE TABLE IF NOT EXISTS site_projects (
 id TEXT PRIMARY KEY NOT NULL,
 title TEXT NOT NULL,
 brief TEXT NOT NULL,
 style TEXT NOT NULL DEFAULT 'notte',
 contact_email TEXT NOT NULL DEFAULT '',
 files_json TEXT NOT NULL,
 audit_json TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_site_projects_created ON site_projects(created_at DESC, id DESC);
