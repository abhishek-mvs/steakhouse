import { ContentSource } from '../../types/contentTypes.js';
import { Organization } from '../../db_models/organization.js';
import { Topic } from '../../db_models/topic.js';
import { buildBlogPrompt } from './blogPromptBuilder.js';
import { buildLinkedInPrompt } from './linkedinPromptBuilder.js';
import { buildTwitterPrompt } from './twitterPromptBuilder.js';
import { buildRedditPrompt } from './redditPromptBuilder.js';
import { BlogSettings, LinkedInSettings, TwitterSettings, RedditSettings } from '../../types/contentTypes.js';

/**
 * Factory function to build the appropriate prompt based on content source
 */
export function buildPrompt(
  source: ContentSource,
  context: {
    organization: Organization;
    topic: Topic;
    keywords: string[];
    scrapedContent?: string;
    settings: BlogSettings | LinkedInSettings | TwitterSettings | RedditSettings;
  }
): string {
  switch (source) {
    case 'blog':
      return buildBlogPrompt({
        organization: context.organization,
        topic: context.topic,
        keywords: context.keywords,
        scrapedContent: context.scrapedContent || '',
        settings: context.settings as Required<BlogSettings>,
      });
    case 'linkedin':
      return buildLinkedInPrompt({
        organization: context.organization,
        topic: context.topic,
        keywords: context.keywords,
        scrapedContent: context.scrapedContent,
        settings: context.settings as Required<LinkedInSettings>,
      });
    case 'twitter':
      return buildTwitterPrompt({
        organization: context.organization,
        topic: context.topic,
        keywords: context.keywords,
        scrapedContent: context.scrapedContent,
        settings: context.settings as Required<TwitterSettings>,
      });
    case 'reddit':
      return buildRedditPrompt({
        organization: context.organization,
        topic: context.topic,
        keywords: context.keywords,
        scrapedContent: context.scrapedContent,
        settings: context.settings as Required<RedditSettings>,
      });
    default:
      throw new Error(`Unsupported content source: ${source}`);
  }
}

