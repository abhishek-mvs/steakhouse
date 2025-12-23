import { getOrganizationById } from "../../services/organizationService";
import { getDomainScrappersByOrganizationId } from "../../services/scrapperService";
import { generateTopics, GeneratedTopic } from "../../agents/topicsAgent";
import { getKeywordsByOrganizationId } from "../../services/keywordService";
import { getTopicsByOrganizationId, upsertTopic } from "../../services/topicService";
import { Topic } from "../../db_models/topic";

/**
 * Generate topics for an organization
 * Fetches organization details, keywords, scraped content, and previous topics,
 * then generates new topics using AI and saves them to the database
 * @param organizationId - Organization ID
 * @returns Array of generated and saved topics
 */
export async function generateTopicsForOrganization(organizationId: string): Promise<Topic[]> {
  // Step 1: Get organization details
  const organization = await getOrganizationById(organizationId);
  if (!organization) {
    throw new Error('Organization not found');
  }

  // Step 2: Get keywords
  const keywordsRecord = await getKeywordsByOrganizationId(organizationId);
  if (!keywordsRecord || !keywordsRecord.keywords || keywordsRecord.keywords.length === 0) {
    throw new Error('Keywords not found. Please generate keywords first.');
  }
  const keywords = keywordsRecord.keywords;

  // Step 3: Get scraped content
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

  // Step 4: Get previous topics to avoid duplicates
  const previousTopics = await getTopicsByOrganizationId(organizationId);
  const previousTopicsForAgent = previousTopics.map((topic) => ({
    title: topic.topic_name,
    slug: topic.slug,
  }));

  // Step 5: Generate topics using AI agent
  const generatedTopics = await generateTopics({
    organization,
    keywords,
    scrapedContent,
    previousTopics: previousTopicsForAgent,
  });

  // Step 6: Save generated topics to database
  const savedTopics: Topic[] = [];
  for (const generatedTopic of generatedTopics) {
    const savedTopic = await upsertTopic(
      organizationId,
      generatedTopic.title,
      generatedTopic.slug,
      'pending',
      generatedTopic.summary || null
    );
    savedTopics.push(savedTopic);
  }

  return savedTopics;
}

/**
 * Get topics for an organization with optional status filter
 * @param organizationId - Organization ID
 * @param status - Optional status filter ('Completed' | 'pending')
 * @returns Array of topics matching the criteria
 */
export async function getTopicsForOrganization(
  organizationId: string,
  status?: 'Completed' | 'pending'
): Promise<Topic[]> {
  return await getTopicsByOrganizationId(organizationId, status);
}

