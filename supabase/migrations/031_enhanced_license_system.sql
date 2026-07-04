-- ============================================================
-- 031_enhanced_license_system.sql
--
-- Comprehensive license & package access system. Adds:
--   1. License key enhancements (expiry, device binding, limits)
--   2. Package enhancements (allowed_menus, duration defaults)
--   3. Account license columns (expiry, grace period)
--   4. Audit log table
--   5. License activation log table
--   6. Helper functions for license validation
-- ============================================================

-- ============================================================
-- 1. ENHANCE license_keys TABLE
-- ============================================================
ALTER TABLE license_keys
  ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_activations INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS activation_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS duration TEXT,
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMPTZ;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_license_keys_user ON license_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_license_keys_status ON license_keys(status);
CREATE INDEX IF NOT EXISTS idx_license_keys_key_code ON license_keys(key_code);

-- ============================================================
-- 2. ENHANCE packages TABLE
-- ============================================================
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS allowed_menus TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS duration TEXT NOT NULL DEFAULT '30 Days',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- 3. ENHANCE accounts TABLE — license columns
-- ============================================================
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS license_activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS license_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS allowed_menus TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES packages(id) ON DELETE SET NULL;

-- ============================================================
-- 4. ENHANCE profiles TABLE
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_ip INET;

-- ============================================================
-- 5. AUDIT LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_logs_account ON audit_logs(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);

CREATE POLICY audit_logs_select ON audit_logs FOR SELECT
  USING (is_account_member(account_id, 'admin'));

CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 6. LICENSE ACTIVATION LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS license_activation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_key_id UUID REFERENCES license_keys(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  device_fingerprint TEXT,
  ip_address INET,
  action TEXT NOT NULL CHECK (action IN ('activate', 'validate', 'deactivate', 'transfer', 'expire')),
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE license_activation_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_license_activation_logs_key ON license_activation_logs(license_key_id);
CREATE INDEX IF NOT EXISTS idx_license_activation_logs_user ON license_activation_logs(user_id);

CREATE POLICY license_activation_logs_select ON license_activation_logs FOR SELECT
  USING (is_account_member(account_id, 'admin'));

CREATE POLICY license_activation_logs_insert ON license_activation_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 7. HELPER: Check if a license is currently valid
-- ============================================================
CREATE OR REPLACE FUNCTION is_license_valid(p_license_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key RECORD;
BEGIN
  SELECT * INTO v_key
  FROM license_keys
  WHERE key_code = p_license_key
    AND status IN ('active', 'used');

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check expiry
  IF v_key.expiry_date IS NOT NULL AND v_key.expiry_date < NOW() THEN
    RETURN false;
  END IF;

  -- Check activation limit
  IF v_key.activation_count > v_key.max_activations THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

ALTER FUNCTION is_license_valid(TEXT) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION is_license_valid(TEXT) TO authenticated, service_role;

-- ============================================================
-- 8. HELPER: Get remaining days for a license
-- ============================================================
CREATE OR REPLACE FUNCTION get_license_remaining_days(p_license_key TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key RECORD;
BEGIN
  SELECT * INTO v_key
  FROM license_keys
  WHERE key_code = p_license_key;

  IF NOT FOUND OR v_key.expiry_date IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN GREATEST(0, EXTRACT(DAY FROM (v_key.expiry_date - NOW()))::INTEGER);
END;
$$;

ALTER FUNCTION get_license_remaining_days(TEXT) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION get_license_remaining_days(TEXT) TO authenticated, service_role;

-- ============================================================
-- 9. HELPER: Check if account is in grace period
-- ============================================================
CREATE OR REPLACE FUNCTION is_in_grace_period(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account RECORD;
BEGIN
  SELECT * INTO v_account
  FROM accounts
  WHERE id = p_account_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- If no expiry, not in grace period
  IF v_account.license_expires_at IS NULL THEN
    RETURN false;
  END IF;

  -- If license is still valid, not in grace period
  IF v_account.license_expires_at > NOW() THEN
    RETURN false;
  END IF;

  -- Check grace period
  IF v_account.grace_period_ends_at IS NOT NULL AND v_account.grace_period_ends_at > NOW() THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

ALTER FUNCTION is_in_grace_period(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION is_in_grace_period(UUID) TO authenticated, service_role;

-- ============================================================
-- 10. Seed default packages if none exist
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM packages LIMIT 1) THEN
    INSERT INTO packages (name, code, features, price, allowed_menus, duration) VALUES
    (
      'Starter',
      'Starter',
      ARRAY['Dashboard', 'Basic Inbox', 'Contacts', 'Notifications', '1 WhatsApp Connection', 'Basic Messaging'],
      '$29/mo',
      ARRAY['dashboard', 'inbox', 'notifications', 'contacts'],
      '30 Days'
    ),
    (
      'Premium',
      'Premium',
      ARRAY['Everything in Starter', 'Pipelines & Deals', 'Broadcasts', 'Automations', 'Flows', 'Up to 3 WhatsApp Connections', 'Visual Flow Editor'],
      '$79/mo',
      ARRAY['dashboard', 'inbox', 'notifications', 'contacts', 'pipelines', 'broadcasts', 'automations', 'flows'],
      '30 Days'
    ),
    (
      'Max',
      'Max',
      ARRAY['Full software access', 'All current and future modules', 'AI Agents', 'Unlimited WhatsApp Channels', 'Priority Support', 'Custom Integrations'],
      '$149/mo',
      ARRAY['dashboard', 'inbox', 'notifications', 'contacts', 'pipelines', 'broadcasts', 'automations', 'flows', 'agents'],
      '30 Days'
    );
  END IF;
END $$;
