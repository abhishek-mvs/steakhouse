/**
 * User model - Domain entity representing a user from the database
 */
export interface UserProfile {
  user_id: string;
  organization_id: string;
  role: 'Admin' | 'Member';
  name: string;
  email: string;
}

