import { generateTextWithAI } from '../pkg/ai/gemini.js';
import { Organization } from '../schemas/organization.js';
import { Scrapper } from '../db_models/scrapper.js';

/**
 * Context for company summary generation
 */
interface SummaryGenerationContext {
  organization: Organization;
  scrappers: Scrapper[];
}

/**
 * Generate comprehensive company summary
 * @param context - Summary generation context with organization and scrapped data
 * @returns Company summary as a string
 */
export async function generateCompanySummary(context: SummaryGenerationContext): Promise<string> {
  const { organization, scrappers } = context;

  // Combine all scraped content
  const scrapedContent = scrappers
    .map((scrapper) => scrapper.extracted_text)
    .filter((text) => text && text.trim().length > 0)
    .join('\n\n');

  const prompt = buildSummaryPrompt({
    organization,
    scrapedContent,
  });

  console.log('Prompt for organization: ', prompt);
  const response = await generateTextWithAI({
    prompt,
    systemPrompt: 'You are an expert business analyst specializing in comprehensive company analysis and competitive intelligence.',
    temperature: 0.7,
    maxTokens: 6000,
  });

  // Clean the response - remove markdown code blocks if present
  let cleaned = response.trim();
  cleaned = cleaned.replace(/^```(?:.*)?\n?/i, '');
  cleaned = cleaned.replace(/\n?```\s*$/m, '');
  cleaned = cleaned.trim();

  if (!cleaned || cleaned.length === 0) {
    throw new Error('Failed to generate company summary');
  }

  return cleaned;
}

/**
 * Build the company summary generation prompt
 */
function buildSummaryPrompt(context: { organization: Organization; scrapedContent: string }): string {
  const { organization, scrapedContent } = context;

  return `Generate a comprehensive company summary for the following organization:

Company Details:
- Name: ${organization.name}
- Domain: ${organization.domain_url}
- Industry: ${organization.industry ?? 'Not specified'}
- Description: ${organization.description ?? 'Not provided'}
- Elevator Pitch: ${organization.elevator_pitch ?? 'Not provided'}
- Target Audience: ${organization.target_audience_description ?? 'Not specified'}
${organization.competitive_url && organization.competitive_url.length > 0 
  ? `- Competitive URLs: ${organization.competitive_url.join(', ')}` 
  : ''}

Scraped Website Content:
${scrapedContent ? scrapedContent.substring(0, 8000) : 'No scraped content available'}

Please provide a comprehensive analysis that includes:

1. **Overview**: A high-level summary of what the company is (2-3 sentences)

2. **What They Do**: Detailed description of the company's products, services, and core business activities

3. **Key Components**: List of key components, features, products, or services they offer (as a bulleted list)

4. **Competitors**: List of identified competitors based on competitive URLs and industry analysis (if available)

5. **Competitive Analysis**: Analysis of what competitors are doing, how the company differentiates, and competitive positioning

6. **Target Audience**: Detailed description of who their target customers are

7. **Value Proposition**: What value they provide to their customers and their unique selling points

Format your response as structured text with the following format:
overview: <Brief overview text (2-3 sentences)>
whatTheyDo: <Detailed description of what they do>
keyComponents: <Component 1, Component 2, Component 3, ...>
competitors: <Competitor 1, Competitor 2, ...>
competitiveAnalysis: <Detailed competitive analysis text>
targetAudience: <Detailed target audience description>
valueProposition: <Value proposition and unique selling points>

Return ONLY the structured text in this format, no markdown code blocks, no additional text or explanations.`;
}


