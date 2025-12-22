/**
 * Signup request input
 */
export interface SignupInput {
  email: string;
  password: string;
  name: string;
  organization_id: string;
  role?: 'Admin' | 'Member'; // Optional, defaults to 'Member'
}

/**
 * Signup result with user profile and session (same as login result)
 */
export { LoginResult } from './login.js';

