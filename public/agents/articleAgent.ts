import { Organization } from '../db_models/organization.js';
import { Topic } from '../db_models/topic.js';
import { generateTextWithAI, streamTextWithAI } from '../pkg/ai/gemini.js';
import { countWords } from '../utils/commonUtils.js';
import { contentToMarkdown } from '../utils/markdownConverter.js';
import { ContentSource, PlatformContent, ArticleSettings, BlogSettings, LinkedInSettings, TwitterSettings, RedditSettings } from '../types/contentTypes.js';
import { loadPrompt } from './prompts/promptLoaderFactory.js';
import { buildPrompt } from './promptBuilders/promptBuilderFactory.js';
import { parseContent } from './parsers/contentParserFactory.js';

/**
 * Generated article interface (before saving to database)
 */
export interface GeneratedArticle {
  content: PlatformContent;
  markdown: string;
  wordCount: number;
  source: ContentSource;
}

/**
 * Context for article generation
 */
export interface ArticleGenerationContext {
  organization: Organization;
  topic: Topic;
  keywords: string[];
  scrapedContent?: string;
  settings?: ArticleSettings;
  source?: ContentSource; // Default: 'blog'
}

/**
 * Get platform-specific default settings
 */
function getDefaultSettings(source: ContentSource): Required<BlogSettings | LinkedInSettings | TwitterSettings | RedditSettings> {
  switch (source) {
    case 'blog':
      return {
        min_article_length: 2000,
        faq_count: 5,
        faq_answer_length: 100,
      } as Required<BlogSettings>;
    case 'linkedin':
      return {
        max_characters: 3000,
        hashtag_count: 5,
        include_cta: true,
      } as Required<LinkedInSettings>;
    case 'twitter':
      return {
        max_characters: 280,
        thread_count: 1,
        hashtag_count: 2,
      } as Required<TwitterSettings>;
    case 'reddit':
      return {
        max_post_length: 4000,
        include_comments: false,
        comment_count: 0,
      } as Required<RedditSettings>;
    default:
      throw new Error(`Unsupported content source: ${source}`);
  }
}

/**
 * Calculate maxTokens based on source and settings
 */
function calculateMaxTokens(source: ContentSource, settings: ArticleSettings): number {
  switch (source) {
    case 'blog': {
      const blogSettings = settings as BlogSettings;
      const minLength = blogSettings.min_article_length ?? 2000;
      const faqCount = blogSettings.faq_count ?? 5;
      const faqAnswerLength = blogSettings.faq_answer_length ?? 100;
      
      const estimatedTokensForContent = minLength * 3;
      const estimatedTokensForFAQ = faqCount * faqAnswerLength * 3;
      const estimatedTokensForMetadata = 3000;
  const bufferMultiplier = 2.0;
  
  const totalEstimatedTokens = estimatedTokensForContent + estimatedTokensForFAQ + estimatedTokensForMetadata;
      return Math.min(Math.ceil(totalEstimatedTokens * bufferMultiplier), 8192);
    }
    case 'linkedin': {
      const linkedinSettings = settings as LinkedInSettings;
      const maxChars = linkedinSettings.max_characters ?? 3000;
      // Estimate tokens for content
      const estimatedTokensForContent = maxChars * 0.3; // Content tokens
      const estimatedTokensForMetadata = 800; // JSON structure, fields, arrays
      const estimatedTokensForHashtags = 100; // Hashtag array
      const bufferMultiplier = 2.0; // Safety buffer
      const totalEstimatedTokens = (estimatedTokensForContent + estimatedTokensForMetadata + estimatedTokensForHashtags) * bufferMultiplier;
      return Math.min(Math.ceil(totalEstimatedTokens), 4096);
    }
    case 'twitter': {
      const twitterSettings = settings as TwitterSettings;
      const maxChars = twitterSettings.max_characters ?? 280;
      const threadCount = twitterSettings.thread_count ?? 1;
      // Estimate tokens for content (tweets)
      // 1 character ≈ 0.25 tokens, but account for JSON structure overhead
      const estimatedTokensForContent = maxChars * threadCount * 0.3; // Content tokens
      const estimatedTokensForMetadata = 500; // JSON structure, fields, arrays
      const estimatedTokensForHashtags = 50; // Hashtag array
      const bufferMultiplier = 2.0; // Safety buffer
      const totalEstimatedTokens = (estimatedTokensForContent + estimatedTokensForMetadata + estimatedTokensForHashtags) * bufferMultiplier;
      return Math.min(Math.ceil(totalEstimatedTokens), 2048);
    }
    case 'reddit': {
      const redditSettings = settings as RedditSettings;
      const maxLength = redditSettings.max_post_length ?? 4000;
      const commentCount = redditSettings.comment_count ?? 0;
      // Estimate tokens for post + comments
      const estimatedTokensForContent = maxLength * 0.3; // Post content tokens
      const estimatedTokensForComments = commentCount * 600; // Rough estimate per comment (with JSON structure)
      const estimatedTokensForMetadata = 600; // JSON structure, fields, arrays
      const bufferMultiplier = 2.0; // Safety buffer
      const totalEstimatedTokens = (estimatedTokensForContent + estimatedTokensForComments + estimatedTokensForMetadata) * bufferMultiplier;
      return Math.min(Math.ceil(totalEstimatedTokens), 6144);
    }
    default:
      return 4096; // Default fallback
  }
}

/**
 * Clean content based on source (remove unwanted sections)
 */
function cleanContent(source: ContentSource, content: PlatformContent): PlatformContent {
  if (source === 'blog') {
    const blogContent = content as any; // Type assertion needed
  let cleanedContent = blogContent.content;
    
    // Remove FAQ sections that might have been included in content
  const faqPatterns = [
    /\n\n##\s*FAQs?\s*$/i,
    /\n\n##\s*Frequently\s+Asked\s+Questions?\s*$/i,
    /\n\n##\s*FAQs?\s*\n.*$/is,
    /\n\n##\s*Frequently\s+Asked\s+Questions?\s*\n.*$/is,
  ];
  
  for (const pattern of faqPatterns) {
    cleanedContent = cleanedContent.replace(pattern, '');
  }
  
  cleanedContent = cleanedContent.replace(/\n\n\*\*Q:\*\*.*$/is, '');
  cleanedContent = cleanedContent.replace(/\n\nQ:\s*.*$/is, '');
  cleanedContent = cleanedContent.trim();
  
  blogContent.content = cleanedContent;
    return blogContent;
  }
  
  // For other platforms, return as-is (no cleaning needed)
  return content;
}

/**
 * Generate article for a topic
 * @param context - Article generation context with organization, topic, keywords, scraped content, optional settings, and source
 * @returns Generated article with content, markdown, word count, and source
 */
export async function generateArticle(context: ArticleGenerationContext): Promise<GeneratedArticle> {
  const { organization, topic, keywords, scrapedContent, settings = {}, source = 'blog' } = context;

  // Get platform-specific default settings
  const defaultSettings = getDefaultSettings(source);
  const platformSettings = { ...defaultSettings, ...settings };

  // Load prompt and build prompt
  const systemPrompt = loadPrompt(source);
  const prompt = buildPrompt(source, {
    organization,
    topic,
    keywords,
    scrapedContent,
    settings: platformSettings,
  });

  // Calculate maxTokens
  const maxTokens = calculateMaxTokens(source, platformSettings);

  let platformContent: PlatformContent;
  let jsonResponse: string | undefined;

  try {
    // Generate content using AI
    console.log('Generating content using AI', organization.name, organization.domain_url, prompt, systemPrompt, maxTokens);
    jsonResponse = await generateTextWithAI({
      prompt,
      systemPrompt,
      temperature: 0.7,
      maxTokens,
    });

    if (!jsonResponse || jsonResponse.trim().length === 0) {
      throw new Error('AI returned empty response for content generation');
    }
    console.log('jsonResponse', jsonResponse);
    // Parse content from response
    platformContent = parseContent(source, jsonResponse, organization.name, organization.domain_url);
  } catch (error) {
    console.warn('⚠️ Content generation/parsing failed');
    console.warn(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new Error(
      `Content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Clean content if needed (e.g., remove FAQ sections from blog content)
  platformContent = cleanContent(source, platformContent);

  // Convert to markdown
  const markdownContent = contentToMarkdown(source, platformContent);

  // Count words (from markdown content)
  const wordCount = countWords(markdownContent);

  return {
    content: platformContent,
    markdown: markdownContent,
    wordCount,
    source,
  };
}