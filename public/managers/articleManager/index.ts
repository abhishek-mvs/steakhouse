import { getOrganizationById } from "../../services/organizationService";
import { getDomainScrappersByOrganizationId } from "../../services/scrapperService";
import { generateArticle } from "../../agents/articleAgent";
import { getKeywordsByOrganizationId } from "../../services/keywordService";
import { getTopicById, updateTopicStatus } from "../../services/topicService";
import { createArticle, getArticlesByOrganizationId } from "../../services/articleService";
import { Article } from "../../db_models/article";

/**
 * Generate article for a topic in an organization
 * Fetches organization details, topic, keywords, scraped content,
 * then generates article using AI and saves it to the database
 * @param organizationId - Organization ID
 * @param topicId - Topic ID for which to generate the article
 * @returns Generated and saved article
 */
export async function generateArticleForOrganization(
  organizationId: string,
  topicId: string
): Promise<Article> {
  // Step 1: Get organization details
  const organization = await getOrganizationById(organizationId);
  if (!organization) {
    throw new Error('Organization not found');
  }

  // Step 2: Get topic details
  const topic = await getTopicById(topicId);
  if (!topic) {
    throw new Error('Topic not found');
  }

  // Verify topic belongs to the organization
  if (topic.organization_id !== organizationId) {
    throw new Error('Topic does not belong to the specified organization');
  }

  // Step 3: Get keywords
  const keywordsRecord = await getKeywordsByOrganizationId(organizationId);
  if (!keywordsRecord || !keywordsRecord.keywords || keywordsRecord.keywords.length === 0) {
    throw new Error('Keywords not found. Please generate keywords first.');
  }
  const keywords = keywordsRecord.keywords;

  // Step 4: Get scraped content
  const domainScrappers = await getDomainScrappersByOrganizationId(organizationId);
  if (!domainScrappers || domainScrappers.length === 0) {
    throw new Error('Scraped content not found. Please scrape organization URLs first.');
  }
  const scrapedContent = domainScrappers
    .map((scrapper) => scrapper.extracted_text)
    .filter((text) => text && text.trim().length > 0)
    .join('\n');
  
  if (!scrapedContent || scrapedContent.trim().length === 0) {
    throw new Error('Scraped content is empty. Please scrape organization URLs first.');
  }

  // Step 5: Generate article using AI agent
  const generatedArticle = await generateArticle({
    organization,
    topic,
    keywords,
    scrapedContent,
  });

  // Step 6: Save article to database
  const savedArticle = await createArticle(
    organizationId,
    topicId,
    generatedArticle.markdown,
    generatedArticle.wordCount,
    null // source can be set later if needed
  );

  // Step 7: Update topic status to 'Completed'
  await updateTopicStatus(topicId, 'Completed');

  return savedArticle;
}

/**
 * Get articles for an organization with optional topic filter
 * @param organizationId - Organization ID
 * @param topicId - Optional topic ID filter
 * @returns Array of articles matching the criteria
 */
export async function getArticlesForOrganization(
  organizationId: string,
  topicId?: string
): Promise<Article[]> {
  return await getArticlesByOrganizationId(organizationId, topicId);
}

