import { Organization } from '../../db_models/organization.js';
import { Topic } from '../../db_models/topic.js';
import { RedditSettings } from '../../types/contentTypes.js';

/**
 * Build the Reddit post generation prompt
 */
export function buildRedditPrompt(context: {
  organization: Organization;
  topic: Topic;
  keywords: string[];
  scrapedContent?: string;
  settings: Required<RedditSettings>;
}): string {
  const { organization, topic, keywords, scrapedContent, settings } = context;
  const now = new Date();
  const publishedAt = now.toISOString().split('T')[0];
  const authorUrl = `${organization.domain_url}/about`;

  return `Generate an authentic, engaging Reddit post for the following topic:

Topic: ${topic.topic_name}
Summary: ${topic.summary ?? 'Not provided'}

Business Context:
- Name: ${organization.name}
- Industry: ${organization.industry ?? 'Not specified'}
- Description: ${organization.description ?? 'Not provided'}
- Target Audience: ${organization.target_audience_description ?? 'Not specified'}
- Domain: ${organization.domain_url}

${organization.summary ? `Company Summary:\n${organization.summary.substring(0, 2000)}\n` : ''}
${scrapedContent ? `Website Content Context:\n${scrapedContent.substring(0, 2000)}\n` : ''}

Relevant Keywords: ${keywords.slice(0, 30).join(', ')}

Content Requirements:
- Title: Maximum 300 characters, compelling and clear
- Post body: Optimal 1000-${settings.max_post_length} characters
- Authentic, conversational tone (not promotional)
- Provide genuine value to the community
- Format with proper markdown
- ${settings.include_comments ? `Include ${settings.comment_count} anticipated Q&A comments` : 'No comments required'}

CRITICAL REQUIREMENTS:
1. The \`title\` field must be compelling and under 300 characters
2. The \`content\` field should contain the full post body (1000-${settings.max_post_length} characters)
3. Use authentic, conversational language (write like a real person, not a brand)
4. Avoid overly promotional language
5. Use proper markdown formatting (bold, lists, line breaks)
6. Structure with clear paragraphs and sections
7. ${settings.include_comments ? `Include ${settings.comment_count} anticipated questions and thoughtful answers in the \`comments\` array` : 'Do not include comments'}
8. Be helpful, detailed, and community-focused

Metadata Requirements:
- Set publishedAt: "${publishedAt}"
- Set updatedAt: "${publishedAt}"
- Set author name: "${organization.name}"
- Set author url: "${authorUrl}"
${settings.include_comments ? `- Include ${settings.comment_count} Q&A comments in the \`comments\` array` : ''}

Return a valid JSON object matching the RedditPostContent type. The post should be authentic, valuable, and optimized for Reddit community engagement.`;
}

