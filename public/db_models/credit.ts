/**
 * Credit Balance model
 */
export interface CreditBalance {
  organization_id: string;
  balance: number;
  updated_at: string;
}

/**
 * Credit Pricing model
 */
export interface CreditPricing {
  id: string;
  action_type: string;
  platform: 'blog' | 'linkedin' | 'twitter' | 'reddit';
  credits_required: number;
  created_at: string;
  updated_at: string;
}

/**
 * Credit Ledger Entry model (append-only audit log)
 */
export interface CreditLedgerEntry {
  id: string;
  organization_id: string;
  user_id: string | null;
  article_id: string | null;
  action_type: string;
  platform: 'blog' | 'linkedin' | 'twitter' | 'reddit' | null;
  credits_delta: number; // Negative for usage, positive for grants
  balance_after: number;
  metadata: Record<string, any>;
  created_at: string;
}

/**
 * Credit Grant model
 */
export interface CreditGrant {
  id: string;
  organization_id: string;
  granted_by_user_id: string | null;
  credits_amount: number;
  reason: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

/**
 * Result from deduct_credits_for_article PostgreSQL function
 */
export interface DeductCreditsResult {
  success: boolean;
  balance_after: number;
  credits_deducted: number;
  error_message: string | null;
}

/**
 * Result from grant_credits PostgreSQL function
 */
export interface GrantCreditsResult {
  success: boolean;
  balance_after: number;
  error_message: string | null;
}

/**
 * Credit ledger query filters
 */
export interface CreditLedgerFilters {
  organizationId: string;
  startDate?: string;
  endDate?: string;
  platform?: 'blog' | 'linkedin' | 'twitter' | 'reddit';
  actionType?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Paginated credit ledger response
 */
export interface PaginatedCreditLedger {
  entries: CreditLedgerEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

