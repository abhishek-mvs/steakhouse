import { getSupabaseAdminClient } from "../../pkg/db/supabaseClient.js";
import { Article } from "../../db_models/article.js";

/**
 * Get articles for an organization
 * @param organizationId - Organization ID
 * @param topicId - Optional topic ID filter
 * @returns Array of articles for the organization
 */
export async function getArticlesByOrganizationId(
  organizationId: string,
  topicId?: string
): Promise<Article[]> {
  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from('articles')
    .select('*')
    .eq('organization_id', organizationId);

  if (topicId) {
    query = query.eq('topic_id', topicId);
  }

  const { data: articles, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to fetch articles');
  }

  return articles || [];
}

/**
 * Get article by ID
 * @param articleId - Article ID
 * @returns Article or null if not found
 */
export async function getArticleById(articleId: string): Promise<Article | null> {
  const supabase = getSupabaseAdminClient();

  const { data: article, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', articleId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw new Error(error.message || 'Failed to fetch article');
  }

  return article;
}

/**
 * Create a new article
 * @param organizationId - Organization ID
 * @param topicId - Topic ID
 * @param mdText - Markdown text content
 * @param wordCount - Word count
 * @param source - Source (optional)
 * @returns Created article
 */
export async function createArticle(
  organizationId: string,
  topicId: string,
  mdText: string,
  wordCount: number,
  source?: string | null
): Promise<Article> {
  const supabase = getSupabaseAdminClient();

  const { data: article, error } = await supabase
    .from('articles')
    .insert({
      organization_id: organizationId,
      topic_id: topicId,
      md_text: mdText,
      word_count: wordCount,
      source: source || null,
    })
    .select()
    .single();

  if (error || !article) {
    throw new Error(error?.message || 'Failed to create article');
  }

  return article;
}

