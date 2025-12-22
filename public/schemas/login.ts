import { UserProfile } from './user.js';
/**
 * Login result with user profile and session
 */
export interface LoginResult {
    user: UserProfile;
    session: {
      access_token: string;
      refresh_token: string;
      expires_at: number | null;
      expires_in: number | null;
    };
  }