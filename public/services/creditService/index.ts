import { getSupabaseAdminClient } from "../../pkg/db/supabaseClient.js";
import {
  CreditBalance,
  CreditLedgerEntry,
  CreditPricing,
  DeductCreditsResult,
  GrantCreditsResult,
} from "../../db_models/credit.js";
import { ContentSource } from "../../types/contentTypes.js";

/**
 * Get credit balance record for an organization
 * @param organizationId - Organization ID
 * @returns Credit balance record or null if not found
 */
export async function getCreditBalanceByOrganizationId(
  organizationId: string
): Promise<CreditBalance | null> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from('credit_balances')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch credit balance: ${error.message}`);
  }

  return data;
}

/**
 * Call PostgreSQL function to atomically deduct credits for article creation
 * Uses row-level locking (SELECT ... FOR UPDATE) for concurrency safety
 * 
 * @param organizationId - Organization ID
 * @param userId - User ID performing the action (optional)
 * @param platform - Content platform (blog, linkedin, twitter, reddit)
 * @param creditsRequired - Number of credits required for this action (must be positive)
 * @param articleId - Article ID (optional, can be null during generation)
 * @param metadata - Additional metadata to store in ledger
 * @returns Result from PostgreSQL function
 */
export async function deductCreditsForArticle(
  organizationId: string,
  userId: string | null,
  platform: ContentSource,
  creditsRequired: number,
  articleId: string | null = null,
  metadata: Record<string, any> = {}
): Promise<DeductCreditsResult> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.rpc('deduct_credits_for_article', {
    p_organization_id: organizationId,
    p_user_id: userId,
    p_action_type: 'ARTICLE_CREATE',
    p_platform: platform,
    p_credits_required: creditsRequired,
    p_article_id: articleId,
    p_metadata: metadata,
  });

  if (error) {
    throw new Error(`Failed to deduct credits: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('Credit deduction function returned no result');
  }

  return data[0] as DeductCreditsResult;
}

/**
 * Call PostgreSQL function to grant credits to an organization
 * @param organizationId - Organization ID
 * @param grantedByUserId - User ID granting credits (optional)
 * @param creditsAmount - Amount of credits to grant
 * @param reason - Reason for grant (optional)
 * @param metadata - Additional metadata
 * @returns Result from PostgreSQL function
 */
export async function grantCredits(
  organizationId: string,
  grantedByUserId: string | null,
  creditsAmount: number,
  reason: string | null = null,
  metadata: Record<string, any> = {}
): Promise<GrantCreditsResult> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.rpc('grant_credits', {
    p_organization_id: organizationId,
    p_granted_by_user_id: grantedByUserId,
    p_credits_amount: creditsAmount,
    p_reason: reason,
    p_metadata: metadata,
  });

  if (error) {
    throw new Error(`Failed to grant credits: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('Grant credits function returned no result');
  }

  return data[0] as GrantCreditsResult;
}

/**
 * Get credit pricing for an action type and platform
 * @param actionType - Action type (e.g., 'ARTICLE_CREATE')
 * @param platform - Platform (blog, linkedin, twitter, reddit)
 * @returns Credit pricing or null if not found
 */
export async function getCreditPricingByActionAndPlatform(
  actionType: string,
  platform: ContentSource
): Promise<CreditPricing | null> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from('credit_pricing')
    .select('*')
    .eq('action_type', actionType)
    .eq('platform', platform)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch credit pricing: ${error.message}`);
  }

  return data;
}

/**
 * Get credit ledger entries for an organization with filters
 * @param organizationId - Organization ID
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 * @param platform - Optional platform filter
 * @param actionType - Optional action type filter
 * @param page - Page number (default: 1)
 * @param pageSize - Page size (default: 50)
 * @returns Array of ledger entries and total count
 */
export async function getCreditLedgerEntries(
  organizationId: string,
  startDate?: string,
  endDate?: string,
  platform?: ContentSource,
  actionType?: string,
  page: number = 1,
  pageSize: number = 50
): Promise<{ entries: CreditLedgerEntry[]; total: number }> {
  const supabase = getSupabaseAdminClient();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('credit_ledger')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (startDate) {
    query = query.gte('created_at', startDate);
  }

  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  if (platform) {
    query = query.eq('platform', platform);
  }

  if (actionType) {
    query = query.eq('action_type', actionType);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch credit ledger: ${error.message}`);
  }

  return {
    entries: (data as CreditLedgerEntry[]) ?? [],
    total: count ?? 0,
  };
}

