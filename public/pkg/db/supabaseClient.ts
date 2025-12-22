import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Client Factory
 * 
 * Uses environment variables to create Supabase clients.
 * Supports both new API key format (sb_secret_... / sb_publishable_...) and legacy keys.
 * 
 * CLIENT INITIALIZATION PATTERN:
 * 
 * 1. Admin Client (Singleton Pattern):
 *    - getSupabaseClient() uses a singleton pattern (initialized once, reused globally)
 *    - WHY: The admin client uses service_role key which has the same privileges for all requests
 *    - It's stateless (no session management needed)
 *    - More efficient: creates connection pool once instead of per-request
 *    - Thread-safe: Supabase client is stateless and can be safely shared
 * 
 * 2. Auth Client (Per-Request Pattern):
 *    - createAuthClient() creates a new client per request
 *    - WHY: Each request has a different access token (user-specific)
 *    - The Authorization header needs to be set per-request with the user's token
 *    - Stateless per request - each client instance is independent
 * 
 * BEST PRACTICE:
 * - Use getSupabaseClient() for all database operations (queries, inserts, etc.)
 * - Use createAuthClient(accessToken) only for authentication operations that need user context
 */

let adminClient: SupabaseClient | null = null;

/**
 * Get Supabase client with elevated (admin) privileges.
 * Uses SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.
 * 
 * ⚠️ Only use in backend components: servers, Edge Functions, microservices.
 * This bypasses Row Level Security (RLS).
 * 
 * SINGLETON PATTERN: Initializes once on first call, then reuses the same instance.
 * This is safe and efficient because:
 * - The client is stateless (no session storage)
 * - All requests use the same service_role key (same privileges)
 * - Creates connection pool once instead of per-request
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (!adminClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !secretKey) {
      throw new Error(
        'Missing Supabase configuration. Please set SUPABASE_URL and either SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY in your environment variables.'
      );
    }

    adminClient = createClient(supabaseUrl, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return adminClient;
}

/**
 * Create a Supabase client for authentication (per-request).
 * Uses publishable key and can be used with session tokens.
 * 
 * PER-REQUEST PATTERN: Creates a new client instance for each request.
 * This is necessary because:
 * - Each request has a different access token (user-specific)
 * - The Authorization header must be set per-request with the user's token
 * - Each client instance needs its own token context
 * - Lightweight: creating a client is fast (just configuration, not a connection)
 * 
 * @param accessToken - Optional access token from session (required for authenticated operations)
 */
export function createAuthClient(accessToken?: string): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      'Missing Supabase configuration for auth. Please set SUPABASE_URL and either SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY in your environment variables.'
    );
  }

  const client = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
    global: {
      headers: accessToken ? {
        Authorization: `Bearer ${accessToken}`,
      } : undefined,
    },
  });

  return client;
}

