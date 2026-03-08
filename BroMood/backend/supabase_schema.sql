-- ─── BroMood Supabase Schema ─────────────────────────────────────────────────
-- Only anonymised mood trends are stored here.
-- No journal content, no chat messages, no personal identifiers.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Anonymised mood trends (cloud backup, opt-in only)
CREATE TABLE IF NOT EXISTS mood_trends (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      TEXT NOT NULL,         -- anonymous UUID from device, not linked to PII
  mood_score   REAL NOT NULL CHECK(mood_score >= 1 AND mood_score <= 10),
  logged_at    TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, logged_at)
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_mood_trends_user_id ON mood_trends(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_trends_logged_at ON mood_trends(logged_at DESC);

-- Row Level Security — users can only access their own data
ALTER TABLE mood_trends ENABLE ROW LEVEL SECURITY;

-- Policy: insert own data
CREATE POLICY "Users can insert own mood trends"
  ON mood_trends FOR INSERT
  WITH CHECK (true);  -- auth handled by backend, not Supabase auth

-- Policy: select own data
CREATE POLICY "Users can view own mood trends"
  ON mood_trends FOR SELECT
  USING (true);

-- Policy: delete own data
CREATE POLICY "Users can delete own mood trends"
  ON mood_trends FOR DELETE
  USING (true);

-- Retention: auto-delete data older than 90 days
-- (Run this as a scheduled Supabase function or cron job)
-- DELETE FROM mood_trends WHERE logged_at < NOW() - INTERVAL '90 days';
