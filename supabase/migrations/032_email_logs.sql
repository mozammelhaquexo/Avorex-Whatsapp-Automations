-- Migration: email_logs table for tracking all transactional emails
-- Stores every email sent through the system for audit/debug.

CREATE TABLE IF NOT EXISTS email_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id  UUID REFERENCES accounts(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient   TEXT NOT NULL,
  subject     TEXT NOT NULL,
  email_type  TEXT NOT NULL, -- 'license_expiry', 'payment_confirmed', 'login_alert', 'role_changed', 'member_joined', 'member_removed', 'weekly_digest', 'verification'
  status      TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'bounced'
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for account-level queries (admin panel email history)
CREATE INDEX IF NOT EXISTS idx_email_logs_account ON email_logs(account_id, created_at DESC);

-- Index for user-level queries
CREATE INDEX IF NOT EXISTS idx_email_logs_user ON email_logs(user_id, created_at DESC);

-- Index for type-based queries (cron jobs checking dedup)
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(email_type, created_at DESC);

-- RLS: only service role can write, users can read their own
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe for re-running)
DROP POLICY IF EXISTS "Service role full access" ON email_logs;
DROP POLICY IF EXISTS "Users can read own logs" ON email_logs;

CREATE POLICY "Service role full access" ON email_logs
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can read own logs" ON email_logs
  FOR SELECT
  USING (user_id = auth.uid());
