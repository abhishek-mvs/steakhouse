import { Organization } from '../../db_models/organization.js';
import { Topic } from '../../db_models/topic.js';
import { LinkedInSettings } from '../../types/contentTypes.js';

/**
 * Build the LinkedIn post generation prompt
 */
export function buildLinkedInPrompt(context: {
  organization: Organization;
  topic: Topic;
  keywords: string[];
  scrapedContent?: string;
  settings: Required<LinkedInSettings>;
}): string {
  const { organization, topic, keywords, scrapedContent, settings } = context;
  const now = new Date();
  const publishedAt = now.toISOString().split('T')[0];
  const authorUrl = `${organization.domain_url}/about`;

  return `Generate an engaging, professional LinkedIn post for the following topic:

Topic: ${topic.topic_name}
Summary: ${topic.summary ?? 'Not provided'}

Business Context:
- Name: ${organization.name}
- Industry: ${organization.industry ?? 'Not specified'}
- Description: ${organization.description ?? 'Not provided'}
- Target Audience: ${organization.target_audience_description ?? 'Not specified'}
- Domain: ${organization.domain_url}

${organization.summary ? `Company Summary:\n${organization.summary.substring(0, 1500)}\n` : ''}
${scrapedContent ? `Website Content Context:\n${scrapedContent.substring(0, 1500)}\n` : ''}

Relevant Keywords: ${keywords.slice(0, 30).join(', ')}

Content Requirements:
- Maximum characters: ${settings.max_characters} (including spaces)
- Hashtags: EXACTLY ${settings.hashtag_count} relevant hashtags
- Include CTA: ${settings.include_cta ? 'Yes' : 'No'}
- Professional, engaging tone
- Provide immediate value (insights, tips, frameworks, stories)
- Optimize for LinkedIn's algorithm

CRITICAL REQUIREMENTS:
1. The \`title\` field should contain a compelling hook (first line of the post, 100-150 characters)
2. The \`content\` field should contain the full post body (max ${settings.max_characters} characters total)
3. Use proper formatting: line breaks between paragraphs, bold for key points
4. Include ${settings.hashtag_count} relevant hashtags in the \`hashtags\` array
5. ${settings.include_cta ? 'Include a call-to-action question or invitation to engage' : 'No CTA required'}
6. Keep paragraphs short (2-4 sentences each)
7. Use professional but conversational tone

Metadata Requirements:
- Set publishedAt: "${publishedAt}"
- Set updatedAt: "${publishedAt}"
- Set author name: "${organization.name}"
- Set author url: "${authorUrl}"

Return a valid JSON object matching the LinkedInPostContent type. The post should be engaging, valuable, and optimized for LinkedIn engagement.`;
}

