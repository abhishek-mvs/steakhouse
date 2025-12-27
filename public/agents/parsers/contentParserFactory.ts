import { ContentSource } from '../../types/contentTypes.js';
import { parseBlogContent } from './blogContentParser.js';
import { parseLinkedInContent } from './linkedinContentParser.js';
import { parseTwitterContent } from './twitterContentParser.js';
import { parseRedditContent } from './redditContentParser.js';
import { PlatformContent } from '../../types/contentTypes.js';

/**
 * Factory function to parse content based on source
 */
export function parseContent(
  source: ContentSource,
  jsonResponse: string,
  organizationName: string = 'Unknown',
  organizationUrl: string = 'https://example.com'
): PlatformContent {
  switch (source) {
    case 'blog':
      return parseBlogContent(jsonResponse, organizationName, organizationUrl);
    case 'linkedin':
      return parseLinkedInContent(jsonResponse, organizationName, organizationUrl);
    case 'twitter':
      return parseTwitterContent(jsonResponse, organizationName, organizationUrl);
    case 'reddit':
      return parseRedditContent(jsonResponse, organizationName, organizationUrl);
    default:
      throw new Error(`Unsupported content source: ${source}`);
  }
}

