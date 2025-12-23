import { generateTextWithAI } from "../pkg/ai/gemini";
import { Organization } from "../schemas/organization";

interface KeywordGenerationContext {
    organization: Organization;
    scrapedContent: string;
  }

export async function generateKeywords(context: KeywordGenerationContext): Promise<string[]> {

  const prompt = buildKeywordPrompt(context);

  const response = await generateTextWithAI({
    prompt,
    systemPrompt: 'You are an expert SEO keyword researcher specializing in high-intent, commercial keywords.',
  });

  const keywords = parseKeywords(response);

  if (keywords.length === 0) {
    throw new Error('No keywords generated from AI response');
  }

  return keywords;
}

function buildKeywordPrompt(context: KeywordGenerationContext): string {
    const { organization, scrapedContent } = context;
  
    return `Generate exactly 1000 high-intent, SEO/AEO/GEO-relevant keywords for the following business:
  
  Business Name: ${organization.name}
  Industry: ${organization.industry ?? 'Not specified'}
  Description: ${organization.description ?? 'Not provided'}
  Target Audience: ${organization.target_audience_description ?? 'Not specified'}
  
  ${scrapedContent ? `Website Content Summary:\n${scrapedContent.substring(0, 2000)}\n` : ''}
  
  Requirements:
  1. Generate EXACTLY 1000 keywords
  2. Focus on high-intent, commercial keywords
  3. Include SEO (Search Engine Optimization), AEO (Answer Engine Optimization), and GEO (Generative Engine Optimization) relevant terms
  4. Keywords should be specific to the business niche and offerings
  5. Include long-tail keywords and question-based queries
  6. Prioritize keywords that potential customers would search for when looking for products/services like this
  7. Ensure diversity in keyword types: include head terms, mid-tail, long-tail, question-based queries, comparison queries, and informational queries
  8. Cover various search intents: informational, navigational, commercial investigation, and transactional
  
  Format: Return keywords as a comma-separated list, one keyword per line, or as a numbered list. Do not include any other text or explanation.`;
  }
  
  function parseKeywords(response: string): string[] {
    // Try multiple parsing strategies
    const lines = response.split('\n');
    const keywords: string[] = [];
  
    for (const line of lines) {
      // Remove numbering (1., 2., etc.)
      const cleaned = line.replace(/^\d+[.)]\s*/, '').trim();
      
      if (!cleaned) continue;
  
      // Handle comma-separated keywords in a line
      if (cleaned.includes(',')) {
        const split = cleaned.split(',').map((k) => k.trim()).filter(Boolean);
        keywords.push(...split);
      } else {
        keywords.push(cleaned);
      }
    }
  
    // Remove duplicates and filter out empty strings
    return Array.from(new Set(keywords.filter((k) => k.length > 0)));
  }