import { BlogContent } from '../../types/contentTypes.js';
import { extractJsonObject } from './parserUtils.js';

/**
 * Parse BlogContent from AI JSON response
 * Includes robust error handling and attempts to recover from malformed JSON
 */
export function parseBlogContent(
  jsonResponse: string,
  organizationName: string = 'Unknown',
  organizationUrl: string = 'https://example.com'
): BlogContent {
  try {
    const cleaned = extractJsonObject(jsonResponse);
    
    let parsed: BlogContent;
    try {
      parsed = JSON.parse(cleaned) as BlogContent;
    } catch (parseError) {
      // If parsing fails, try to extract partial data
      console.warn('JSON parsing failed, attempting to extract partial data');
      
      const titleMatch = cleaned.match(/"title"\s*:\s*"([^"]+)"/);
      const descriptionMatch = cleaned.match(/"description"\s*:\s*"([^"]+)"/);
      const slugMatch = cleaned.match(/"slug"\s*:\s*"([^"]+)"/);
      const authorNameMatch = cleaned.match(/"author"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/);
      const authorUrlMatch = cleaned.match(/"author"\s*:\s*\{[^}]*"url"\s*:\s*"([^"]+)"/);
      const contentMatch = cleaned.match(/"content"\s*:\s*"([\s\S]*?)(?:"(?:,\s*"[a-z]+"|})|$)/);
      
      const tagsMatch = cleaned.match(/"tags"\s*:\s*\[([^\]]*)\]/);
      const tags = tagsMatch && tagsMatch[1] ? tagsMatch[1].match(/"([^"]+)"/g)?.map(t => t.slice(1, -1)) || [] : [];
      
      const faqMatch = cleaned.match(/"faq"\s*:\s*\[([\s\S]*)\]/);
      let faq: Array<{ question: string; answer: string }> = [];
      if (faqMatch && faqMatch[1]) {
        const faqContent = faqMatch[1];
        const faqItems = faqContent.match(/\{[^}]*"question"\s*:\s*"([^"]+)"[^}]*"answer"\s*:\s*"([^"]+)"[^}]*\}/g);
        if (faqItems) {
          faq = faqItems.map(item => {
            const qMatch = item.match(/"question"\s*:\s*"([^"]+)"/);
            const aMatch = item.match(/"answer"\s*:\s*"([^"]+)"/);
            return {
              question: qMatch && qMatch[1] ? qMatch[1] : '',
              answer: aMatch && aMatch[1] ? aMatch[1] : ''
            };
          }).filter((f): f is { question: string; answer: string } => f.question.length > 0 && f.answer.length > 0);
        }
      }
      
      parsed = {
        title: titleMatch && titleMatch[1] ? titleMatch[1] : 'Untitled',
        description: descriptionMatch && descriptionMatch[1] ? descriptionMatch[1] : '',
        slug: slugMatch && slugMatch[1] ? slugMatch[1] : 'untitled',
        publishedAt: new Date().toISOString().split('T')[0]!,
        updatedAt: new Date().toISOString().split('T')[0]!,
        author: {
          name: authorNameMatch && authorNameMatch[1] ? authorNameMatch[1] : organizationName,
          url: authorUrlMatch && authorUrlMatch[1] ? authorUrlMatch[1] : `${organizationUrl}/about`
        },
        tags: tags.length > 0 ? tags : [],
        faq: faq.length > 0 ? faq : [],
        content: contentMatch && contentMatch[1] ? contentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : ''
      };
    }

    // Validate required fields
    if (!parsed.title || !parsed.description || !parsed.slug) {
      throw new Error('Missing required fields in BlogContent: title, description, or slug');
    }
    
    if (!parsed.content || parsed.content.trim().length === 0) {
      console.warn('Content field is empty - response may have been truncated');
      parsed.content = '';
    }

    if (!parsed.author || !parsed.author.name || !parsed.author.url) {
      throw new Error('Missing required author fields in BlogContent');
    }

    if (!Array.isArray(parsed.tags)) {
      parsed.tags = [];
    }

    if (!Array.isArray(parsed.faq)) {
      parsed.faq = [];
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse BlogContent JSON');
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Response length:', jsonResponse.length);
    console.error('Response preview (first 1000 chars):', jsonResponse.substring(0, 1000));
    
    throw new Error(
      `Failed to parse BlogContent: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
      `The response may be incomplete or malformed.`
    );
  }
}

