/**
 * Article model - Domain entity representing an article from the database
 */
export interface Article {
  id: string;
  organization_id: string;
  topic_id: string;
  md_text: string;
  word_count: number;
  source: string | null;
  created_at: string;
  updated_at: string;
}

