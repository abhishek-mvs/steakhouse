/**
 * Organization schemas - API contracts for organization-related requests/responses
 */

// Re-export model for convenience
export type { Organization } from '../db_models/organization.js';

/**
 * Input for creating a new organization
 */
export interface CreateOrganizationInput {
  name: string;
  domain_url: string;
  competitive_url?: string[];
  description?: string;
  industry?: string;
  elevator_pitch?: string;
  target_audience_description?: string;
}

/**
 * Input for updating an organization
 */
export interface UpdateOrganizationInput {
  name?: string;
  domain_url?: string;
  competitive_url?: string[];
  description?: string;
  industry?: string;
  elevator_pitch?: string;
  target_audience_description?: string;
}

