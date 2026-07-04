-- Migration 032: Email verification codes for custom signup flow
-- Stores 6-digit codes sent via Gmail SMTP (nodemailer)

CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'signup',  -- future: password_reset, etc.
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by email + purpose
CREATE INDEX IF NOT EXISTS idx_email_verifications_email_purpose
  ON email_verifications (email, purpose);

-- Auto-cleanup expired codes (pg_cron optional; this is a safety net)
-- Expired rows are filtered in the API; run DELETE periodically if desired.

-- RLS: only service-role should access this table
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on email_verifications"
  ON email_verifications
  FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE);
