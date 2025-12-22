import { getSupabaseAdminClient } from "../../pkg/db/supabaseClient.js";
import { UserProfile } from "../../models/user.js";

/**
 * Get user profile by user ID from the users table
 * @param userId - User ID from auth.users
 * @returns User profile
 */
export async function getUserProfileById(userId: string): Promise<UserProfile> {
    const supabase = getSupabaseAdminClient();
  
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('user_id, organization_id, role, name, email')
      .eq('user_id', userId)
      .single();
  
    if (profileError || !userProfile) {
      throw new Error(
        profileError?.message || 'User profile not found in database'
      );
    }
  
    return userProfile;
  }

/**
 * Create user profile in the users table
 * @param userId - User ID from auth.users
 * @param email - User email
 * @param name - User name
 * @param organizationId - Organization ID
 * @param role - User role (defaults to 'Member')
 * @returns Created user profile
 */
export async function createUserProfile(
  userId: string,
  email: string,
  name: string,
  organizationId: string,
  role: 'Admin' | 'Member' = 'Member'
): Promise<UserProfile> {
  const supabase = getSupabaseAdminClient();

  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .insert({
      user_id: userId,
      email,
      name,
      organization_id: organizationId,
      role,
    })
    .select('user_id, organization_id, role, name, email')
    .single();

  if (profileError || !userProfile) {
    throw new Error(
      profileError?.message || 'Failed to create user profile'
    );
  }

  return userProfile;
}
  