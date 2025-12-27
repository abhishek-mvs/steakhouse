import {
  getCreditBalanceByOrganizationId,
  deductCreditsForArticle,
  grantCredits,
  getCreditPricingByActionAndPlatform,
  getCreditLedgerEntries,
} from '../../services/creditService/index.js';
import {
  CreditLedgerFilters,
  PaginatedCreditLedger,
} from '../../db_models/credit.js';
import { ContentSource } from '../../types/contentTypes.js';

/**
 * Get current credit balance for an organization
 * Returns 0 if no balance record exists
 * @param organizationId - Organization ID
 * @returns Current credit balance
 */
export async function getCreditBalanceForOrganization(
  organizationId: string
): Promise<number> {
  const balanceRecord = await getCreditBalanceByOrganizationId(organizationId);
  return balanceRecord?.balance ?? 0;
}

/**
 * Check if organization has sufficient credits for an action
 * This is a READ-ONLY check (no locking) for early validation
 * The actual deduction will do a final check with locking
 * 
 * @param organizationId - Organization ID
 * @param actionType - Action type (e.g., 'ARTICLE_CREATE')
 * @param platform - Platform (blog, linkedin, twitter, reddit)
 * @returns Object with hasSufficientCredits boolean and required credits
 * @throws Error if pricing not found
 */
export async function checkSufficientCredits(
  organizationId: string,
  actionType: string,
  platform: ContentSource
): Promise<{ hasSufficientCredits: boolean; currentBalance: number; requiredCredits: number }> {
  // Get current balance
  const currentBalance = await getCreditBalanceForOrganization(organizationId);
  
  // Get pricing
  const pricing = await getCreditPricingByActionAndPlatform(actionType, platform);
  
  if (!pricing) {
    throw new Error(`No pricing found for action_type=${actionType}, platform=${platform}`);
  }
  
  const requiredCredits = pricing.credits_required;
  const hasSufficientCredits = currentBalance >= requiredCredits;
  
  return {
    hasSufficientCredits,
    currentBalance,
    requiredCredits,
  };
}

/**
 * Atomically deduct credits for article creation
 * 
 * CONCURRENCY HANDLING:
 * - Uses PostgreSQL function with SELECT ... FOR UPDATE to lock the credit_balances row
 * - Prevents race conditions when multiple requests try to deduct credits simultaneously
 * - If insufficient credits, throws error with descriptive message
 * 
 * @param organizationId - Organization ID
 * @param userId - User ID performing the action (optional, for ledger tracking)
 * @param platform - Content platform (blog, linkedin, twitter, reddit)
 * @param creditsRequired - Number of credits required for this action (must be positive)
 * @param articleId - Article ID (optional, can be null during generation)
 * @param metadata - Additional metadata to store in ledger
 * @returns Balance after deduction
 * @throws Error if deduction fails (insufficient credits, invalid credits_required, etc.)
 */
export async function deductCreditsForArticleCreation(
  organizationId: string,
  userId: string | null,
  platform: ContentSource,
  creditsRequired: number,
  articleId: string | null = null,
  metadata: Record<string, any> = {}
): Promise<number> {
  // Validate creditsRequired
  if (!creditsRequired || creditsRequired <= 0) {
    throw new Error('creditsRequired must be a positive integer');
  }

  // Call service to deduct credits (service handles DB operation)
  const result = await deductCreditsForArticle(
    organizationId,
    userId,
    platform,
    creditsRequired,
    articleId,
    metadata
  );

  // Business logic: Check if deduction was successful
  if (!result.success) {
    throw new Error(result.error_message || 'Failed to deduct credits');
  }

  return result.balance_after;
}

/**
 * Grant credits to an organization (admin/manual operation)
 * @param organizationId - Organization ID
 * @param grantedByUserId - User ID granting credits (optional)
 * @param creditsAmount - Amount of credits to grant
 * @param reason - Reason for grant (optional)
 * @param metadata - Additional metadata
 * @returns Balance after grant
 */
export async function grantCreditsToOrganization(
  organizationId: string,
  grantedByUserId: string | null,
  creditsAmount: number,
  reason?: string,
  metadata: Record<string, any> = {}
): Promise<number> {
  if (creditsAmount <= 0) {
    throw new Error('Credits amount must be greater than 0');
  }

  const result = await grantCredits(
    organizationId,
    grantedByUserId,
    creditsAmount,
    reason || null,
    metadata
  );

  if (!result.success) {
    throw new Error(result.error_message || 'Failed to grant credits');
  }

  return result.balance_after;
}

/**
 * Get credit pricing information for an action and platform
 * @param actionType - Action type (e.g., 'ARTICLE_CREATE')
 * @param platform - Platform (blog, linkedin, twitter, reddit)
 * @returns Credit pricing information
 * @throws Error if pricing not found
 */
export async function getCreditPricingInfo(
  actionType: string,
  platform: ContentSource
) {
  const pricing = await getCreditPricingByActionAndPlatform(actionType, platform);
  
  if (!pricing) {
    throw new Error(`No pricing found for action_type=${actionType}, platform=${platform}`);
  }

  return pricing;
}

/**
 * Get paginated credit ledger for an organization
 * @param filters - Filter criteria
 * @returns Paginated ledger entries
 */
export async function getCreditLedgerForOrganization(
  filters: CreditLedgerFilters
): Promise<PaginatedCreditLedger> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;

  // Validate pagination
  if (page < 1) {
    throw new Error('Page must be greater than 0');
  }
  if (pageSize < 1 || pageSize > 100) {
    throw new Error('Page size must be between 1 and 100');
  }

  const { entries, total } = await getCreditLedgerEntries(
    filters.organizationId,
    filters.startDate,
    filters.endDate,
    filters.platform,
    filters.actionType,
    page,
    pageSize
  );

  const totalPages = Math.ceil(total / pageSize);

  return {
    entries,
    total,
    page,
    pageSize,
    totalPages,
  };
}

