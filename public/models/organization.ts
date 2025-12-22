/**
 * Organization model - Domain entity representing an organization from the database
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

