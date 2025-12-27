import { getOrganizationById } from "../../services/organizationService";
import { getDomainScrappersByOrganizationId } from "../../services/scrapperService";
import { generateArticle, streamArticle } from "../../agents/articleAgent";
import { getKeywordsByOrganizationId } from "../../services/keywordService";
import { getTopicById, updateTopicStatus } from "../../services/topicService";
import { createArticle, getArticlesByOrganizationId } from "../../services/articleService";
import { Article } from "../../db_models/article";
import { GeneratedArticle } from "../../agents/articleAgent";
import { Organization } from "../../db_models/organization";
import { Topic } from "../../db_models/topic";
import { ContentSource } from "../../types/contentTypes";

/**
 * SSE event types for article generation
 */
export interface ArticleGenerationEvent {
  type: 'chunk' | 'complete' | 'error';
  data?: any;
  chunk?: string;
}

/**
 * Helper function to prepare article generation context
 * Extracted for reuse in both streaming and non-streaming versions
 */
async function prepareArticleGenerationContext(
  organizationId: string,
  topicId: string
): Promise<{
  organization: Organization;
  topic: Topic;
  keywords: string[];
  scrapedContent: string;
}> {
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

  return {
    organization,
    topic,
    keywords,
    scrapedContent,
  };
}

/**
 * Generate article for a topic in an organization
 * Fetches organization details, topic, keywords, scraped content,
 * then generates article using AI and saves it to the database
 * @param organizationId - Organization ID
 * @param topicId - Topic ID for which to generate the article
 * @param source - Content source/platform (default: 'blog')
 * @returns Generated and saved article
 */
export async function generateArticleForOrganization(
  organizationId: string,
  topicId: string,
  source: ContentSource = 'blog'
): Promise<GeneratedArticle> {
  // Prepare context
  const { organization, topic, keywords, scrapedContent } = await prepareArticleGenerationContext(
    organizationId,
    topicId
  );

  // Step 5: Generate article using AI agent
  const generatedArticle = await generateArticle({
    organization,
    topic,
    keywords,
    scrapedContent,
    source,
  });

  // // Step 6: Save article to database
  // const savedArticle = await createArticle(
  //   organizationId,
  //   topicId,
  //   generatedArticle.markdown,
  //   generatedArticle.wordCount,
  //   source // Save source to database
  // );

  // // Step 7: Update topic status to 'Completed'
  // await updateTopicStatus(topicId, 'Completed');

  return generatedArticle;
}

/**
 * Generate article for a topic in an organization with SSE streaming
 * Streams AI generation tokens in real-time and does NOT save to database
 * @param organizationId - Organization ID
 * @param topicId - Topic ID for which to generate the article
 * @param onEvent - Callback function to emit SSE events (chunk events for streaming text)
 * @param source - Content source/platform (default: 'blog')
 * @returns Generated article (not saved to database)
 */
export async function generateArticleForOrganizationStream(
  organizationId: string,
  topicId: string,
  onEvent: (event: ArticleGenerationEvent) => void,
  source: ContentSource = 'blog'
): Promise<GeneratedArticle> {
  try {
    // Prepare context (no events emitted here - just prepare silently)
    const { organization, topic, keywords, scrapedContent } = await prepareArticleGenerationContext(
      organizationId,
      topicId
    );

    // Stream article generation - chunks will be emitted via onEvent
    const generatedArticle = await streamArticle(
      {
        organization,
        topic,
        keywords,
        scrapedContent,
        source,
      },
      (chunk: string) => {
        // Emit each chunk as it comes from Gemini
        onEvent({
          type: 'chunk',
          chunk,
        });
      }
    );

    // Emit completion event with final data
    onEvent({
      type: 'complete',
      data: {
        content: generatedArticle.content,
        markdown: generatedArticle.markdown,
        wordCount: generatedArticle.wordCount,
        source: generatedArticle.source,
      },
    });

    return generatedArticle;
  } catch (error) {
    console.error('Error in generateArticleForOrganizationStream:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    onEvent({
      type: 'error',
      data: { message: errorMessage },
    });
    throw error; // Re-throw so controller can handle it
  }
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

