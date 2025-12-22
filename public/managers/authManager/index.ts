import { LoginResult } from '../../schemas/login.js';
import { SignupInput } from '../../schemas/signup.js';
import { createAuthClient, getSupabaseAdminClient } from '../../pkg/db/supabaseClient.js';
import { getUserProfileById, createUserProfile } from '../../services/userService/index.js';
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
 * Sign out a user session
 * @param accessToken - JWT access token from the user session
 */
export async function signOutUser(accessToken: string): Promise<void> {
  const supabase = createAuthClient(accessToken);
  
  const { error } = await supabase.auth.signOut();
  
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

/**
 * Sign up a new user
 * Creates user in Supabase Auth, then creates profile in users table
 * @param input - Signup input (email, password, name, organization_id, role)
 * @returns Login result with user profile and session
 */
export async function signUpUser(input: SignupInput): Promise<LoginResult> {
  const supabase = createAuthClient();

  // Step 1: Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message || 'Failed to create user account');
  }

  try {
    // Step 2: Create user profile in users table
    const userProfile = await createUserProfile(
      authData.user.id,
      input.email,
      input.name,
      input.organization_id,
      input.role || 'Member'
    );

    // Step 3: Check if session is available
    // Note: If email confirmation is required in Supabase settings,
    // session will be null and user needs to confirm email first
    if (!authData.session) {
      // User created but email confirmation required
      // Don't rollback - user profile is created, they just need to confirm email
      throw new Error(
        'EMAIL_CONFIRMATION_REQUIRED: User created successfully, but email confirmation is required. Please check your email to confirm your account before logging in.'
      );
    }

    // Return user profile with session
    return {
      user: userProfile,
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at ?? null,
        expires_in: authData.session.expires_in ?? null,
      },
    };
  } catch (error) {
    // Only rollback if it's NOT an email confirmation error
    // (Email confirmation errors mean user was created successfully)
    if (!(error instanceof Error && error.message.includes('EMAIL_CONFIRMATION_REQUIRED'))) {
      // Rollback: Delete auth user if profile creation fails
      const adminClient = getSupabaseAdminClient();
      await adminClient.auth.admin.deleteUser(authData.user.id);
    }
    throw error;
  }
}
  
  