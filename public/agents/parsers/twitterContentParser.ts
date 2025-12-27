import { TwitterPostContent } from '../../types/contentTypes.js';
import { extractJsonObject } from './parserUtils.js';

/**
 * Parse TwitterPostContent from AI JSON response
 */
export function parseTwitterContent(
  jsonResponse: string,
  organizationName: string = 'Unknown',
  organizationUrl: string = 'https://example.com'
): TwitterPostContent {
  try {
    const cleaned = extractJsonObject(jsonResponse);
    
    let parsed: TwitterPostContent;
    try {
      parsed = JSON.parse(cleaned) as TwitterPostContent;
    } catch (parseError) {
      // If parsing fails, try to extract partial data
      console.warn('JSON parsing failed, attempting to extract partial data');
      
      const titleMatch = cleaned.match(/"title"\s*:\s*"([^"]+)"/);
      const descriptionMatch = cleaned.match(/"description"\s*:\s*"([^"]+)"/);
      const authorNameMatch = cleaned.match(/"author"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/);
      const authorUrlMatch = cleaned.match(/"author"\s*:\s*\{[^}]*"url"\s*:\s*"([^"]+)"/);
      const contentMatch = cleaned.match(/"content"\s*:\s*"([\s\S]*?)(?:"(?:,\s*"[a-z]+"|})|$)/);
      const isThreadMatch = cleaned.match(/"isThread"\s*:\s*(true|false)/);
      
      const threadTweetsMatch = cleaned.match(/"threadTweets"\s*:\s*\[([\s\S]*?)\]/);
      let threadTweets: string[] = [];
      if (threadTweetsMatch && threadTweetsMatch[1]) {
        const tweets = threadTweetsMatch[1].match(/"([^"]+)"/g);
        if (tweets) {
          threadTweets = tweets.map(t => t.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"'));
        }
      }
      
      const hashtagsMatch = cleaned.match(/"hashtags"\s*:\s*\[([^\]]*)\]/);
      const hashtags = hashtagsMatch && hashtagsMatch[1] 
        ? hashtagsMatch[1].match(/"([^"]+)"/g)?.map(t => t.slice(1, -1)) || [] 
        : [];
      
      parsed = {
        title: titleMatch && titleMatch[1] ? titleMatch[1] : undefined,
        description: descriptionMatch && descriptionMatch[1] ? descriptionMatch[1] : undefined,
        publishedAt: new Date().toISOString().split('T')[0]!,
        updatedAt: new Date().toISOString().split('T')[0]!,
        author: {
          name: authorNameMatch && authorNameMatch[1] ? authorNameMatch[1] : organizationName,
          url: authorUrlMatch && authorUrlMatch[1] ? authorUrlMatch[1] : `${organizationUrl}/about`
        },
        content: contentMatch && contentMatch[1] ? contentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '',
        isThread: isThreadMatch && isThreadMatch[1] === 'true',
        threadTweets: threadTweets.length > 0 ? threadTweets : undefined,
        hashtags: hashtags.length > 0 ? hashtags : [],
      };
    }

    // Validate required fields
    if (!parsed.content || parsed.content.trim().length === 0) {
      throw new Error('Missing required field in TwitterPostContent: content');
    }

    if (!parsed.author || !parsed.author.name || !parsed.author.url) {
      throw new Error('Missing required author fields in TwitterPostContent');
    }

    if (!Array.isArray(parsed.hashtags)) {
      parsed.hashtags = [];
    }

    // If isThread is true, ensure threadTweets exists
    if (parsed.isThread && (!parsed.threadTweets || parsed.threadTweets.length === 0)) {
      console.warn('isThread is true but threadTweets is empty');
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
    console.error('Failed to parse TwitterPostContent JSON');
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Response preview (first 1000 chars):', jsonResponse.substring(0, 1000));
    
    throw new Error(
      `Failed to parse TwitterPostContent: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

