/**
 * Scrapper model - Domain entity representing scrapped website data
 */
export interface Scrapper {
  id: string;
  organization_id: string;
  self: boolean;
  url: string;
  html: string | null;
  extracted_text: string | null;
  created_at: string;
  updated_at: string;
}

