import { Organization } from '../../models/organization.js';
import { CreateOrganizationInput, UpdateOrganizationInput } from '../../schemas/organization.js';
import { getOrganizationById, createOrganization, updateOrganization } from '../../services/organizationService/index.js';
import { getUserProfileById } from '../../services/userService/index.js';

/**
 * Get organization details for the authenticated user
 * @param userId - User ID
 * @returns Organization details
 */
export async function getOrganizationByUserId(userId: string): Promise<Organization> {
  // First get user profile to get organization_id
  const userProfile = await getUserProfileById(userId);
  
  // Then get organization details
  const organization = await getOrganizationById(userProfile.organization_id);
  
  if (!organization) {
    throw new Error('Organization not found');
  }
  
  return organization;
}

/**
 * Create a new organization
 * @param input - Organization input data
 * @returns Created organization
 */
export async function createOrganizationWithInput(input: CreateOrganizationInput): Promise<Organization> {
  return await createOrganization(input);
}

/**
 * Update organization (only if user is Admin)
 * @param userId - User ID to check permissions
 * @param input - Update input data
 * @returns Updated organization
 */
export async function updateOrganizationByUserId(
  userId: string,
  input: UpdateOrganizationInput
): Promise<Organization> {
  // First get user profile to check role and get organization_id
  const userProfile = await getUserProfileById(userId);
  
  // Check if user is Admin
  if (userProfile.role !== 'Admin') {
    throw new Error('Only Admins can update organization details');
  }
  
  // Update organization
  return await updateOrganization(userProfile.organization_id, input);
}

