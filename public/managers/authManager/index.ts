import { LoginResult } from '../../schemas/login.js';
import { createAuthClient, getSupabaseAdminClient } from '../../pkg/db/supabaseClient.js';
import { getUserProfileById } from '../../services/userService/userService.js';
import { UserProfile } from '../../schemas/user.js';

export async function authenticateUser(email: string, password: string): Promise<LoginResult> {
    const supabase = createAuthClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
  
    if (error || !data.user || !data.session) {
      throw new Error(error?.message || 'Authentication failed');
    }
  
    const userProfile = await getUserProfileById(data.user.id);
  
    return {
      user: userProfile,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at ?? null,
        expires_in: data.session.expires_in ?? null,
      },
    };
  }

/**
 * Get user ID from access token
 * @param accessToken - JWT access token
 * @returns User ID
 */
export async function getUserIdFromToken(accessToken: string): Promise<string> {
    const supabase = createAuthClient(accessToken);
  
    const { data: { user }, error: authError } = await supabase.auth.getUser();
  
    if (authError || !user) {
      throw new Error(authError?.message || 'Invalid token');
    }
  
    return user.id;
}

/**
 * Revoke all sessions for a user (logout)
 * @param userId - User ID to sign out
 */
export async function signOutUser(userId: string): Promise<void> {
    const supabase = getSupabaseAdminClient();
  
    const { error } = await supabase.auth.admin.signOut(userId, 'global');
  
    if (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }
  

  /**
 * Get current user profile from access token
 * @param accessToken - JWT access token
 * @returns User profile
 */
export async function getCurrentUserProfile(
    accessToken: string
  ): Promise<UserProfile> {
    const userId = await getUserIdFromToken(accessToken);
    return await getUserProfileById(userId);
  }
  
  