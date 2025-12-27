import { Organization } from '../../db_models/organization.js';
import { Topic } from '../../db_models/topic.js';
import { TwitterSettings } from '../../types/contentTypes.js';

/**
 * Build the Twitter/X post generation prompt
 */
export function buildTwitterPrompt(context: {
  organization: Organization;
  topic: Topic;
  keywords: string[];
  scrapedContent?: string;
  settings: Required<TwitterSettings>;
}): string {
  const { organization, topic, keywords, scrapedContent, settings } = context;
  const now = new Date();
  const publishedAt = now.toISOString().split('T')[0];
  const authorUrl = `${organization.domain_url}/about`;

  const isThread = settings.thread_count > 1;

  return `Generate a concise, engaging Twitter/X ${isThread ? 'thread' : 'post'} for the following topic:

Topic: ${topic.topic_name}
Summary: ${topic.summary ?? 'Not provided'}

Business Context:
- Name: ${organization.name}
- Industry: ${organization.industry ?? 'Not specified'}
- Domain: ${organization.domain_url}

${organization.summary ? `Company Summary:\n${organization.summary.substring(0, 1000)}\n` : ''}
${scrapedContent ? `Website Content Context:\n${scrapedContent.substring(0, 1000)}\n` : ''}

Relevant Keywords: ${keywords.slice(0, 20).join(', ')}

Content Requirements:
- Single tweet: Maximum ${settings.max_characters} characters
- Thread: ${settings.thread_count} tweets, each max ${settings.max_characters} characters
- Hashtags: ${settings.hashtag_count} relevant hashtags
- Concise, punchy, value-driven
- Capture attention in first few words
- Encourage engagement (retweets, likes, replies)

CRITICAL REQUIREMENTS:
1. ${isThread ? `Generate a thread with EXACTLY ${settings.thread_count} tweets` : 'Generate a single tweet'}
2. Each tweet must be under ${settings.max_characters} characters
3. ${isThread ? 'First tweet should end with "🧵" or "A thread:" to indicate it\'s a thread' : ''}
4. ${isThread ? 'Number subsequent tweets (1/5, 2/5, etc.) or use thread markers' : ''}
5. Include ${settings.hashtag_count} relevant hashtags in the \`hashtags\` array
6. Start with a compelling hook (first 50-80 characters)
7. Provide value or insight even in short format
8. Use line breaks for readability within tweets

Metadata Requirements:
- Set publishedAt: "${publishedAt}"
- Set updatedAt: "${publishedAt}"
- Set author name: "${organization.name}"
- Set author url: "${authorUrl}"
- Set isThread: ${isThread}

Return a valid JSON object matching the TwitterPostContent type. ${isThread ? `The \`content\` field should contain the first tweet, and \`threadTweets\` array should contain the remaining ${settings.thread_count - 1} tweets.` : 'The \`content\` field should contain the single tweet.'}`;
}

