import { getSupabaseAdminClient } from "../../pkg/db/supabaseClient.js";
import { Organization, CreateOrganizationInput, UpdateOrganizationInput } from "../../schemas/organization.js";

/**
 * Get organization by ID
 * @param organizationId - Organization ID
 * @returns Organization or null if not found
 */
export async function getOrganizationById(organizationId: string): Promise<Organization | null> {
  const supabase = getSupabaseAdminClient();

  const { data: organization, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  if (error || !organization) {
    if (error?.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw new Error(error?.message || 'Failed to fetch organization');
  }

  return organization;
}

/**
 * Create a new organization
 * @param input - Organization input data
 * @returns Created organization
 */
export async function createOrganization(input: CreateOrganizationInput): Promise<Organization> {
  const supabase = getSupabaseAdminClient();

  const { data: organization, error } = await supabase
    .from('organizations')
    .insert({
      name: input.name,
      domain_url: input.domain_url,
      competitive_url: input.competitive_url || [],
      description: input.description || null,
      industry: input.industry || null,
      elevator_pitch: input.elevator_pitch || null,
      target_audience_description: input.target_audience_description || null,
      remaining_credits: 0,
    })
    .select()
    .single();

  if (error || !organization) {
    throw new Error(error?.message || 'Failed to create organization');
  }

  return organization;
}

/**
 * Update an organization
 * @param organizationId - Organization ID
 * @param input - Update input data
 * @returns Updated organization
 */
export async function updateOrganization(
  organizationId: string,
  input: UpdateOrganizationInput
): Promise<Organization> {
  const supabase = getSupabaseAdminClient();

  // Build update object with only provided fields
  const updateData: Record<string, any> = {};
  
  if (input.name !== undefined) updateData.name = input.name;
  if (input.domain_url !== undefined) updateData.domain_url = input.domain_url;
  if (input.competitive_url !== undefined) updateData.competitive_url = input.competitive_url;
  if (input.description !== undefined) updateData.description = input.description || null;
  if (input.industry !== undefined) updateData.industry = input.industry || null;
  if (input.elevator_pitch !== undefined) updateData.elevator_pitch = input.elevator_pitch || null;
  if (input.target_audience_description !== undefined) updateData.target_audience_description = input.target_audience_description || null;

  const { data: organization, error } = await supabase
    .from('organizations')
    .update(updateData)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error || !organization) {
    throw new Error(error?.message || 'Failed to update organization');
  }

  return organization;
}

