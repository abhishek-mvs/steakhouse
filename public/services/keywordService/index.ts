import { getSupabaseAdminClient } from "../../pkg/db/supabaseClient.js";
import { Keywords } from "../../db_models/keywords.js";




/**
 * Get keywords for an organization
 * @param organizationId - Organization ID
 * @returns Keywords record or null if not found
 */
export async function getKeywordsByOrganizationId(organizationId: string): Promise<Keywords | null> {
  const supabase = getSupabaseAdminClient();

  const { data: keywords, error } = await supabase
    .from('keywords')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw new Error(error.message || 'Failed to fetch keywords');
  }

  return keywords;
}

/**
 * Upsert keywords for an organization
 * Creates a new record if it doesn't exist, or updates existing record
 * @param organizationId - Organization ID
 * @param keywords - Array of keyword strings
 * @returns Created or updated keywords record
 */
export async function upsertKeywords(
  organizationId: string,
  keywords: string[]
): Promise<Keywords> {
  const supabase = getSupabaseAdminClient();

  const { data: keywordsRecord, error } = await supabase
    .from('keywords')
    .upsert({
      organization_id: organizationId,
      keywords: keywords || [],
    }, {
      onConflict: 'organization_id',
    })
    .select()
    .single();

  if (error || !keywordsRecord) {
    throw new Error(error?.message || 'Failed to upsert keywords');
  }

  return keywordsRecord;
}

