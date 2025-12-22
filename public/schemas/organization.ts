/**
 * Organization type from the organizations table
 */
export interface Organization {
  organization_id: string;
  name: string;
  domain_url: string;
  competitive_url: string[];
  description: string | null;
  industry: string | null;
  elevator_pitch: string | null;
  target_audience_description: string | null;
  remaining_credits: number;
  created_at: string;
  updated_at: string;
}

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

