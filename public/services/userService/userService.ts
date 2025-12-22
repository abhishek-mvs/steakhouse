import { getSupabaseAdminClient } from "../../pkg/db/supabaseClient.js";
import { UserProfile } from "../../schemas/user.js";

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
  