import { RedditPostContent } from '../../types/contentTypes.js';
import { extractJsonObject } from './parserUtils.js';

/**
 * Parse RedditPostContent from AI JSON response
 */
export function parseRedditContent(
  jsonResponse: string,
  organizationName: string = 'Unknown',
  organizationUrl: string = 'https://example.com'
): RedditPostContent {
  try {
    const cleaned = extractJsonObject(jsonResponse);
    
    let parsed: RedditPostContent;
    try {
      parsed = JSON.parse(cleaned) as RedditPostContent;
    } catch (parseError) {
      // If parsing fails, try to extract partial data
      console.warn('JSON parsing failed, attempting to extract partial data');
      
      const titleMatch = cleaned.match(/"title"\s*:\s*"([^"]+)"/);
      const descriptionMatch = cleaned.match(/"description"\s*:\s*"([^"]+)"/);
      const authorNameMatch = cleaned.match(/"author"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/);
      const authorUrlMatch = cleaned.match(/"author"\s*:\s*\{[^}]*"url"\s*:\s*"([^"]+)"/);
      const contentMatch = cleaned.match(/"content"\s*:\s*"([\s\S]*?)(?:"(?:,\s*"[a-z]+"|})|$)/);
      const subredditMatch = cleaned.match(/"subreddit"\s*:\s*"([^"]+)"/);
      
      const commentsMatch = cleaned.match(/"comments"\s*:\s*\[([\s\S]*?)\]/);
      let comments: Array<{ question: string; answer: string }> = [];
      if (commentsMatch && commentsMatch[1]) {
        const commentItems = commentsMatch[1].match(/\{[^}]*"question"\s*:\s*"([^"]+)"[^}]*"answer"\s*:\s*"([^"]+)"[^}]*\}/g);
        if (commentItems) {
          comments = commentItems.map(item => {
            const qMatch = item.match(/"question"\s*:\s*"([^"]+)"/);
            const aMatch = item.match(/"answer"\s*:\s*"([^"]+)"/);
            return {
              question: qMatch && qMatch[1] ? qMatch[1] : '',
              answer: aMatch && aMatch[1] ? aMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : ''
            };
          }).filter((c): c is { question: string; answer: string } => c.question.length > 0 && c.answer.length > 0);
        }
      }
      
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
        subreddit: subredditMatch && subredditMatch[1] ? subredditMatch[1] : undefined,
        comments: comments.length > 0 ? comments : undefined,
      };
    }

    // Validate required fields
    if (!parsed.title || !parsed.content || parsed.content.trim().length === 0) {
      throw new Error('Missing required fields in RedditPostContent: title or content');
    }

    if (!parsed.author || !parsed.author.name || !parsed.author.url) {
      throw new Error('Missing required author fields in RedditPostContent');
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
    console.error('Failed to parse RedditPostContent JSON');
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Response preview (first 1000 chars):', jsonResponse.substring(0, 1000));
    
    throw new Error(
      `Failed to parse RedditPostContent: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

