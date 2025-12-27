import { getOrganizationById } from "../../services/organizationService";
import { getDomainScrappersByOrganizationId } from "../../services/scrapperService";
import { generateArticle } from "../../agents/articleAgent";
import { getKeywordsByOrganizationId } from "../../services/keywordService";
import { getTopicById, updateTopicStatus } from "../../services/topicService";
import { createArticle, getArticlesByOrganizationId } from "../../services/articleService";
import { 
  checkSufficientCredits,
  deductCreditsForArticleCreation 
} from "../../managers/creditManager/index.js";
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
 * 
 * CREDIT FLOW:
 * 1. Check credits BEFORE generation (early validation - prevents wasting AI API calls)
 * 2. Generate article using AI
 * 3. Create article in database
 * 4. Deduct credits atomically (final check with locking to prevent race conditions)
 * 
 * @param organizationId - Organization ID
 * @param topicId - Topic ID for which to generate the article
 * @param source - Content source/platform (default: 'blog')
 * @param userId - User ID performing the action (optional, for ledger tracking)
 * @returns Generated and saved article
 */
export async function generateArticleForOrganization(
  organizationId: string,
  topicId: string,
  source: ContentSource = 'blog',
  userId: string | null = null
): Promise<GeneratedArticle> {
  // STEP 1: Check credits BEFORE generating (early validation)
  // This prevents wasting expensive AI API calls if credits are insufficient
  const creditCheck = await checkSufficientCredits(
    organizationId,
    'ARTICLE_CREATE',
    source
  );
  
  if (!creditCheck.hasSufficientCredits) {
    throw new Error(
      `Insufficient credits. Required: ${creditCheck.requiredCredits}, Available: ${creditCheck.currentBalance}`
    );
  }

  // STEP 2: Prepare context
  const { organization, topic, keywords, scrapedContent } = await prepareArticleGenerationContext(
    organizationId,
    topicId
  );

  // STEP 3: Generate article using AI agent (expensive operation)
  const generatedArticle = await generateArticle({
    organization,
    topic,
    keywords,
    scrapedContent,
    source,
  });

  // STEP 4: Create article in database FIRST (so we have articleId)
  const savedArticle = await createArticle(
    organizationId,
    topicId,
    generatedArticle.markdown,
    generatedArticle.wordCount,
    source
  );

  // STEP 5: Deduct credits WITH articleId (atomic operation with locking)
  // This does a FINAL check with row-level locking to prevent race conditions
  // Even though we checked earlier, another request might have deducted credits
  // The PostgreSQL function will handle this atomically
  // Use the creditsRequired from the earlier check
  try {
    await deductCreditsForArticleCreation(
      organizationId,
      userId,
      source,
      creditCheck.requiredCredits, // Pass creditsRequired from the check
      savedArticle.id, // ✅ Now we have the articleId
      {
        topicId,
        topicName: topic.topic_name,
        source,
      }
    );
  } catch (error) {
    // If credit deduction fails (e.g., credits were used by another request),
    // we should handle the rollback
    // Option 1: Delete the article (cleanup)
    // Option 2: Mark article as "pending_payment"
    // For now, we'll throw and let the caller handle it
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Credit deduction failed after article creation: ${errorMessage}. Article ID: ${savedArticle.id}`);
  }

  // STEP 6: Update topic status to 'Completed'
  await updateTopicStatus(topicId, 'Completed');

  return generatedArticle;
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

