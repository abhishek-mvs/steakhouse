import { getSupabaseAdminClient } from "../../pkg/db/supabaseClient.js";
import { Scrapper } from "../../models/scrapper.js";

/**
 * Create a new scrapper record
 * @param organizationId - Organization ID
 * @param url - URL to scrape
 * @param self - Whether this is the organization's own URL
 * @param html - Raw HTML content (optional)
 * @param extractedText - Extracted text content (optional)
 * @returns Created scrapper record
 */
export async function createScrapper(
  organizationId: string,
  url: string,
  self: boolean = false,
  html?: string,
  extractedText?: string
): Promise<Scrapper> {
  const supabase = getSupabaseAdminClient();

  const { data: scrapper, error } = await supabase
    .from('scrapper')
    .insert({
      organization_id: organizationId,
      url,
      self,
      html: html || null,
      extracted_text: extractedText || null,
    })
    .select()
    .single();

  if (error || !scrapper) {
    throw new Error(error?.message || 'Failed to create scrapper record');
  }

  return scrapper;
}

/**
 * Get scrapper by ID
 * @param id - Scrapper ID
 * @returns Scrapper record or null if not found
 */
export async function getScrapperById(id: string): Promise<Scrapper | null> {
  const supabase = getSupabaseAdminClient();

  const { data: scrapper, error } = await supabase
    .from('scrapper')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw new Error(error.message || 'Failed to fetch scrapper');
  }

  return scrapper;
}

/**
 * Get all scrappers for an organization
 * @param organizationId - Organization ID
 * @returns Array of scrapper records
 */
export async function getScrappersByOrganizationId(organizationId: string): Promise<Scrapper[]> {
  const supabase = getSupabaseAdminClient();

  const { data: scrappers, error } = await supabase
    .from('scrapper')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to fetch scrappers');
  }

  return scrappers || [];
}

/**
 * Get scrapper by organization ID and URL
 * @param organizationId - Organization ID
 * @param url - URL
 * @returns Scrapper record or null if not found
 */
export async function getScrapperByUrl(
  organizationId: string,
  url: string
): Promise<Scrapper | null> {
  const supabase = getSupabaseAdminClient();

  const { data: scrapper, error } = await supabase
    .from('scrapper')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('url', url)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw new Error(error.message || 'Failed to fetch scrapper');
  }

  return scrapper;
}

/**
 * Update scrapper record
 * @param id - Scrapper ID
 * @param updates - Fields to update
 * @returns Updated scrapper record
 */
export async function updateScrapper(
  id: string,
  updates: {
    html?: string;
    extracted_text?: string;
    self?: boolean;
  }
): Promise<Scrapper> {
  const supabase = getSupabaseAdminClient();

  const updateData: Record<string, any> = {};
  if (updates.html !== undefined) updateData.html = updates.html || null;
  if (updates.extracted_text !== undefined) updateData.extracted_text = updates.extracted_text || null;
  if (updates.self !== undefined) updateData.self = updates.self;

  const { data: scrapper, error } = await supabase
    .from('scrapper')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error || !scrapper) {
    throw new Error(error?.message || 'Failed to update scrapper');
  }

  return scrapper;
}

/**
 * Create or update scrapper record (upsert)
 * If record exists with same organization_id and url, update it; otherwise create new one
 * @param organizationId - Organization ID
 * @param url - URL
 * @param self - Whether this is the organization's own URL
 * @param html - Raw HTML content (optional)
 * @param extractedText - Extracted text content (optional)
 * @returns Created or updated scrapper record
 */
export async function upsertScrapper(
  organizationId: string,
  url: string,
  self: boolean = false,
  html?: string,
  extractedText?: string
): Promise<Scrapper> {
  const supabase = getSupabaseAdminClient();

  const { data: scrapper, error } = await supabase
    .from('scrapper')
    .upsert({
      organization_id: organizationId,
      url,
      self,
      html: html || null,
      extracted_text: extractedText || null,
    }, {
      onConflict: 'organization_id,url',
    })
    .select()
    .single();

  if (error || !scrapper) {
    throw new Error(error?.message || 'Failed to upsert scrapper');
  }

  return scrapper;
}

