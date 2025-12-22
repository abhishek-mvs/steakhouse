/**
 * Keywords model - Domain entity representing keywords for an organization
 */
export interface Keywords {
  organization_id: string;
  keywords: string[];
  created_at: string;
  updated_at: string;
}

