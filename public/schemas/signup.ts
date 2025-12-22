/**
 * Signup request input
 */
export interface SignupInput {
  email: string;
  password: string;
  name: string;
  organization_name: string; // Organization name - creates a new organization
  domain_url: string; // Organization domain URL
  role?: 'Admin' | 'Member'; // Optional, defaults to 'Admin' for organization creator
}

/**
 * Signup result with user profile and session (same as login result)
 */
export { LoginResult } from './login.js';

