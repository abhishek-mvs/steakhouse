/**
 * Topic model - Domain entity representing a topic from the database
 */
export interface Topic {
  id: string;
  organization_id: string;
  topic_name: string;
  status: 'Completed' | 'pending';
  slug: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

