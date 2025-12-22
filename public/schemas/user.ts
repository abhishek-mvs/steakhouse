/**
 * User profile type from the users table
 */
export interface UserProfile {
    user_id: string;
    organization_id: string;
    role: 'Admin' | 'Member';
    name: string;
    email: string;
  }