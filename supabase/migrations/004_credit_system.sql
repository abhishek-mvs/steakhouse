-- ============================================================================
-- CREDIT SYSTEM MIGRATION
-- ============================================================================
-- This migration creates a production-grade credit system for article creation
-- All credit mutations are transactional and ledger-based

-- ============================================================================
-- CREDIT_BALANCES TABLE
-- ============================================================================
-- Single source of truth for current credit balances
-- Uses row-level locking (SELECT ... FOR UPDATE) for concurrency safety
CREATE TABLE credit_balances (
  organization_id UUID PRIMARY KEY REFERENCES organizations(organization_id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_credit_balances_org_id ON credit_balances(organization_id);

-- ============================================================================
-- CREDIT_PRICING TABLE
-- ============================================================================
-- Fully DB-driven pricing configuration
-- Pricing changes do not require code changes
CREATE TABLE credit_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('blog', 'linkedin', 'twitter', 'reddit')),
  credits_required INTEGER NOT NULL CHECK (credits_required > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(action_type, platform)
);

-- Index for fast pricing lookups
CREATE INDEX idx_credit_pricing_lookup ON credit_pricing(action_type, platform);

-- Insert default pricing (can be updated via admin later)
INSERT INTO credit_pricing (action_type, platform, credits_required) VALUES
  ('ARTICLE_CREATE', 'blog', 10),
  ('ARTICLE_CREATE', 'linkedin', 5),
  ('ARTICLE_CREATE', 'twitter', 3),
  ('ARTICLE_CREATE', 'reddit', 5)
ON CONFLICT (action_type, platform) DO NOTHING;

-- ============================================================================
-- CREDIT_LEDGER TABLE (Append-Only)
-- ============================================================================
-- Immutable audit log of all credit transactions
-- Never update or delete rows from this table
CREATE TABLE credit_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('blog', 'linkedin', 'twitter', 'reddit')),
  credits_delta INTEGER NOT NULL, -- Negative for usage, positive for grants
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast ledger queries
CREATE INDEX idx_credit_ledger_org_id ON credit_ledger(organization_id);
CREATE INDEX idx_credit_ledger_org_created ON credit_ledger(organization_id, created_at DESC);
CREATE INDEX idx_credit_ledger_action_type ON credit_ledger(action_type);
CREATE INDEX idx_credit_ledger_platform ON credit_ledger(platform);
CREATE INDEX idx_credit_ledger_article_id ON credit_ledger(article_id);

-- ============================================================================
-- CREDIT_GRANTS TABLE (Optional - for admin/manual credit additions)
-- ============================================================================
CREATE TABLE credit_grants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  granted_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  credits_amount INTEGER NOT NULL CHECK (credits_amount > 0),
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for grant lookups
CREATE INDEX idx_credit_grants_org_id ON credit_grants(organization_id);
CREATE INDEX idx_credit_grants_created ON credit_grants(created_at DESC);

-- ============================================================================
-- UPDATE TRIGGER FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_credit_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_credit_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE TRIGGER update_credit_balances_updated_at BEFORE UPDATE ON credit_balances
  FOR EACH ROW EXECUTE FUNCTION update_credit_balances_updated_at();

CREATE TRIGGER update_credit_pricing_updated_at BEFORE UPDATE ON credit_pricing
  FOR EACH ROW EXECUTE FUNCTION update_credit_pricing_updated_at();

-- ============================================================================
-- POSTGRESQL FUNCTION: ATOMIC CREDIT DEDUCTION
-- ============================================================================
-- This function atomically:
-- 1. Locks the credit_balances row (SELECT ... FOR UPDATE)
-- 2. Fetches current balance
-- 3. Validates sufficient credits
-- 4. Deducts credits
-- 5. Inserts ledger entry
-- 6. Returns success/failure
--
-- CONCURRENCY HANDLING:
-- - Uses SELECT ... FOR UPDATE to lock the row during transaction
-- - Prevents race conditions when multiple requests try to deduct credits simultaneously
-- - If insufficient credits, transaction rolls back automatically
--
-- USAGE:
-- SELECT * FROM deduct_credits_for_article(
--   p_organization_id := 'uuid',
--   p_user_id := 'uuid',
--   p_action_type := 'ARTICLE_CREATE',
--   p_platform := 'blog',
--   p_article_id := 'uuid' (optional)
-- );
CREATE OR REPLACE FUNCTION deduct_credits_for_article(
  p_organization_id UUID,
  p_user_id UUID,
  p_action_type TEXT,
  p_platform TEXT,
  p_article_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE(
  success BOOLEAN,
  balance_after INTEGER,
  credits_deducted INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_credits_required INTEGER;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_balance_after INTEGER;
BEGIN
  -- Step 1: Lock the credit_balances row for this organization
  -- This prevents concurrent modifications (row-level locking)
  SELECT balance INTO v_current_balance
  FROM credit_balances
  WHERE organization_id = p_organization_id
  FOR UPDATE; -- Critical: This locks the row until transaction commits/rolls back

  -- If no balance row exists, create one with 0 balance
  IF v_current_balance IS NULL THEN
    INSERT INTO credit_balances (organization_id, balance)
    VALUES (p_organization_id, 0)
    ON CONFLICT (organization_id) DO NOTHING;
    
    -- Re-fetch after potential insert
    SELECT balance INTO v_current_balance
    FROM credit_balances
    WHERE organization_id = p_organization_id
    FOR UPDATE;
    
    -- If still null, something went wrong
    IF v_current_balance IS NULL THEN
      RETURN QUERY SELECT false, 0, 0, 'Failed to initialize credit balance'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Step 2: Fetch credit cost from credit_pricing
  SELECT credits_required INTO v_credits_required
  FROM credit_pricing
  WHERE action_type = p_action_type
    AND platform = p_platform;

  -- If pricing not found, return error
  IF v_credits_required IS NULL THEN
    RETURN QUERY SELECT false, v_current_balance, 0, 
      format('No pricing found for action_type=%s, platform=%s', p_action_type, p_platform)::TEXT;
    RETURN;
  END IF;

  -- Step 3: Validate sufficient balance
  IF v_current_balance < v_credits_required THEN
    RETURN QUERY SELECT false, v_current_balance, 0,
      format('Insufficient credits. Required: %s, Available: %s', v_credits_required, v_current_balance)::TEXT;
    RETURN;
  END IF;

  -- Step 4: Calculate new balance
  v_new_balance := v_current_balance - v_credits_required;
  v_balance_after := v_new_balance;

  -- Step 5: Update credit_balances (atomic within transaction)
  UPDATE credit_balances
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE organization_id = p_organization_id;

  -- Step 6: Insert ledger entry (append-only, immutable)
  INSERT INTO credit_ledger (
    organization_id,
    user_id,
    article_id,
    action_type,
    platform,
    credits_delta,
    balance_after,
    metadata
  ) VALUES (
    p_organization_id,
    p_user_id,
    p_article_id,
    p_action_type,
    p_platform,
    -v_credits_required, -- Negative for usage
    v_balance_after,
    p_metadata
  );

  -- Step 7: Return success
  RETURN QUERY SELECT true, v_balance_after, v_credits_required, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- POSTGRESQL FUNCTION: GRANT CREDITS (for admin/manual additions)
-- ============================================================================
-- Atomically grants credits and creates ledger entry
CREATE OR REPLACE FUNCTION grant_credits(
  p_organization_id UUID,
  p_granted_by_user_id UUID,
  p_credits_amount INTEGER,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE(
  success BOOLEAN,
  balance_after INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Lock and get current balance
  SELECT balance INTO v_current_balance
  FROM credit_balances
  WHERE organization_id = p_organization_id
  FOR UPDATE;

  -- Initialize if doesn't exist
  IF v_current_balance IS NULL THEN
    INSERT INTO credit_balances (organization_id, balance)
    VALUES (p_organization_id, 0)
    ON CONFLICT (organization_id) DO NOTHING;
    
    SELECT balance INTO v_current_balance
    FROM credit_balances
    WHERE organization_id = p_organization_id
    FOR UPDATE;
    
    IF v_current_balance IS NULL THEN
      RETURN QUERY SELECT false, 0, 'Failed to initialize credit balance'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Calculate new balance
  v_new_balance := v_current_balance + p_credits_amount;

  -- Update balance
  UPDATE credit_balances
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE organization_id = p_organization_id;

  -- Insert grant record
  INSERT INTO credit_grants (
    organization_id,
    granted_by_user_id,
    credits_amount,
    reason,
    metadata
  ) VALUES (
    p_organization_id,
    p_granted_by_user_id,
    p_credits_amount,
    p_reason,
    p_metadata
  );

  -- Insert ledger entry
  INSERT INTO credit_ledger (
    organization_id,
    user_id,
    action_type,
    credits_delta,
    balance_after,
    metadata
  ) VALUES (
    p_organization_id,
    p_granted_by_user_id,
    'CREDIT_GRANT',
    p_credits_amount, -- Positive for grants
    v_new_balance,
    jsonb_build_object('reason', p_reason, 'grant_id', (SELECT id FROM credit_grants WHERE organization_id = p_organization_id ORDER BY created_at DESC LIMIT 1))
  );

  RETURN QUERY SELECT true, v_new_balance, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

