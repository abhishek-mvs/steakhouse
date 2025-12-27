import { Organization } from '../../db_models/organization.js';
import { Topic } from '../../db_models/topic.js';
import { BlogSettings } from '../../types/contentTypes.js';

/**
 * Build the blog/article generation prompt
 */
export function buildBlogPrompt(context: {
  organization: Organization;
  topic: Topic;
  keywords: string[];
  scrapedContent: string;
  settings: Required<BlogSettings>;
}): string {
  const { organization, topic, keywords, scrapedContent, settings } = context;
  const now = new Date();
  const publishedAt = now.toISOString().split('T')[0];
  const authorUrl = `${organization.domain_url}/about`;

  return `Generate a comprehensive, SEO/AEO/GEO-optimized article for the following topic:

Topic Title: ${topic.topic_name}
Topic Summary: ${topic.summary ?? 'Not provided'}

Business Context:
- Name: ${organization.name}
- Industry: ${organization.industry ?? 'Not specified'}
- Description: ${organization.description ?? 'Not provided'}
- Target Audience: ${organization.target_audience_description ?? 'Not specified'}
- Domain URL: ${organization.domain_url}

${scrapedContent ? `Website Content Context:\n${scrapedContent.substring(0, 2000)}\n` : ''}

Relevant Keywords (use naturally throughout):
${keywords.slice(0, 50).join(', ')}

Content Requirements (STRICT - MUST BE FOLLOWED):
- Minimum word count for article content: ${settings.min_article_length} words (this is the MAIN article body, excluding FAQ section)
- FAQ section: EXACTLY ${settings.faq_count} questions (no more, no less)
- Each FAQ answer: AT LEAST ${settings.faq_answer_length} words per answer (each answer must meet this minimum)
- Include tables, key takeaways, and structured content as per guidelines
- Optimize for SEO, AEO, and GEO

CRITICAL REQUIREMENTS:
1. The article content (main body) must be at least ${settings.min_article_length} words
2. The FAQ section is SEPARATE - FAQs go in the \`faq\` array, NOT in the \`content\` field
3. The \`content\` field should contain ONLY the article body (introduction, main content, conclusion)
4. DO NOT include "## FAQs" or any FAQ section in the \`content\` field
5. The \`faq\` array must contain EXACTLY ${settings.faq_count} items, each with a question and an answer of at least ${settings.faq_answer_length} words

Metadata Requirements:
- Use the topic title as the article title
- Generate a compelling description (150-200 characters)
- Use slug: "${topic.slug}"
- Set publishedAt: "${publishedAt}"
- Set updatedAt: "${publishedAt}"
- Set author name: "${organization.name}"
- Set author url: "${authorUrl}"
- Extract relevant tags from the keywords provided (5-10 tags)
- FAQ array must contain EXACTLY ${settings.faq_count} items, each with a question and an answer of at least ${settings.faq_answer_length} words

Return a valid JSON object matching the BlogContent type as specified in the system prompt. 
IMPORTANT: The \`content\` field should contain ONLY the article body markdown (no FAQ section). The FAQ section goes in the separate \`faq\` array field.`;
}

