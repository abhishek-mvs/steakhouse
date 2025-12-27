-- ============================================================================
-- UPDATE DEDUCT_CREDITS_FOR_ARTICLE FUNCTION
-- ============================================================================
-- This migration updates the deduct_credits_for_article function to accept
-- credits_required as a parameter instead of fetching it from credit_pricing table.
-- This allows the application layer to determine credits_required using custom logic.

-- Drop the old function
DROP FUNCTION IF EXISTS deduct_credits_for_article(
  UUID, UUID, TEXT, TEXT, UUID, JSONB
);

-- Create the updated function with credits_required as a parameter
CREATE OR REPLACE FUNCTION deduct_credits_for_article(
  p_organization_id UUID,
  p_user_id UUID,
  p_action_type TEXT,
  p_platform TEXT,
  p_credits_required INTEGER,
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
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_balance_after INTEGER;
BEGIN
  -- Validate credits_required is positive
  IF p_credits_required IS NULL OR p_credits_required <= 0 THEN
    RETURN QUERY SELECT false, 0, 0, 
      format('Invalid credits_required: %s. Must be a positive integer.', p_credits_required)::TEXT;
    RETURN;
  END IF;

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

  -- Step 2: Validate sufficient balance
  -- (credits_required is now passed as parameter, no need to fetch from credit_pricing)
  IF v_current_balance < p_credits_required THEN
    RETURN QUERY SELECT false, v_current_balance, 0,
      format('Insufficient credits. Required: %s, Available: %s', p_credits_required, v_current_balance)::TEXT;
    RETURN;
  END IF;

  -- Step 3: Calculate new balance
  v_new_balance := v_current_balance - p_credits_required;
  v_balance_after := v_new_balance;

  -- Step 4: Update credit_balances (atomic within transaction)
  UPDATE credit_balances
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE organization_id = p_organization_id;

  -- Step 5: Insert ledger entry (append-only, immutable)
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
    -p_credits_required, -- Negative for usage
    v_balance_after,
    p_metadata
  );

  -- Step 6: Return success
  RETURN QUERY SELECT true, v_balance_after, p_credits_required, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

