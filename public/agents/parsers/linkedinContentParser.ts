import { LinkedInPostContent } from '../../types/contentTypes.js';
import { extractJsonObject } from './parserUtils.js';

/**
 * Parse LinkedInPostContent from AI JSON response
 */
export function parseLinkedInContent(
  jsonResponse: string,
  organizationName: string = 'Unknown',
  organizationUrl: string = 'https://example.com'
): LinkedInPostContent {
  try {
    const cleaned = extractJsonObject(jsonResponse);
    
    let parsed: LinkedInPostContent;
    try {
      parsed = JSON.parse(cleaned) as LinkedInPostContent;
    } catch (parseError) {
      // If parsing fails, try to extract partial data
      console.warn('JSON parsing failed, attempting to extract partial data');
      
      const titleMatch = cleaned.match(/"title"\s*:\s*"([^"]+)"/);
      const descriptionMatch = cleaned.match(/"description"\s*:\s*"([^"]+)"/);
      const authorNameMatch = cleaned.match(/"author"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/);
      const authorUrlMatch = cleaned.match(/"author"\s*:\s*\{[^}]*"url"\s*:\s*"([^"]+)"/);
      const contentMatch = cleaned.match(/"content"\s*:\s*"([\s\S]*?)(?:"(?:,\s*"[a-z]+"|})|$)/);
      const ctaMatch = cleaned.match(/"callToAction"\s*:\s*"([^"]+)"/);
      
      const hashtagsMatch = cleaned.match(/"hashtags"\s*:\s*\[([^\]]*)\]/);
      const hashtags = hashtagsMatch && hashtagsMatch[1] 
        ? hashtagsMatch[1].match(/"([^"]+)"/g)?.map(t => t.slice(1, -1)) || [] 
        : [];
      
      parsed = {
        title: titleMatch && titleMatch[1] ? titleMatch[1] : 'Untitled',
        description: descriptionMatch && descriptionMatch[1] ? descriptionMatch[1] : undefined,
        publishedAt: new Date().toISOString().split('T')[0]!,
        updatedAt: new Date().toISOString().split('T')[0]!,
        author: {
          name: authorNameMatch && authorNameMatch[1] ? authorNameMatch[1] : organizationName,
          url: authorUrlMatch && authorUrlMatch[1] ? authorUrlMatch[1] : `${organizationUrl}/about`
        },
        content: contentMatch && contentMatch[1] ? contentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '',
        callToAction: ctaMatch && ctaMatch[1] ? ctaMatch[1] : undefined,
        hashtags: hashtags.length > 0 ? hashtags : [],
      };
    }

    // Validate required fields
    if (!parsed.title || !parsed.content || parsed.content.trim().length === 0) {
      throw new Error('Missing required fields in LinkedInPostContent: title or content');
    }

    if (!parsed.author || !parsed.author.name || !parsed.author.url) {
      throw new Error('Missing required author fields in LinkedInPostContent');
    }

    if (!Array.isArray(parsed.hashtags)) {
      parsed.hashtags = [];
    }

    // Ensure publishedAt and updatedAt are set
    if (!parsed.publishedAt) {
      parsed.publishedAt = new Date().toISOString().split('T')[0]!;
    }
    if (!parsed.updatedAt) {
      parsed.updatedAt = new Date().toISOString().split('T')[0]!;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse LinkedInPostContent JSON');
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Response preview (first 1000 chars):', jsonResponse.substring(0, 1000));
    
    throw new Error(
      `Failed to parse LinkedInPostContent: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

