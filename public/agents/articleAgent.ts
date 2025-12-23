import { readFileSync } from 'fs';
import { join } from 'path';
import { Organization } from '../db_models/organization.js';
import { Topic } from '../db_models/topic.js';
import { generateTextWithAI } from '../pkg/ai/gemini.js';
import { countWords } from '../utils/commonUtils.js';
import { BlogContent, blogContentToMarkdown } from '../utils/markdownConverter.js';

/**
 * Article generation settings
 */
export interface ArticleSettings {
  min_article_length?: number;
  faq_count?: number;
  faq_answer_length?: number;
}

/**
 * Generated article interface (before saving to database)
 */
export interface GeneratedArticle {
  blogContent: BlogContent;
  markdown: string;
  wordCount: number;
}

/**
 * Context for article generation
 */
export interface ArticleGenerationContext {
  organization: Organization;
  topic: Topic;
  keywords: string[];
  scrapedContent: string;
  settings?: ArticleSettings;
}

/**
 * Generate article for a topic
 * @param context - Article generation context with organization, topic, keywords, scraped content, and optional settings
 * @returns Generated article with blogContent, markdown, and word count
 */
export async function generateArticle(context: ArticleGenerationContext): Promise<GeneratedArticle> {
  const { organization, topic, keywords, scrapedContent, settings = {} } = context;

  // Default settings
  const articleSettings: Required<ArticleSettings> = {
    min_article_length: settings.min_article_length ?? 2000,
    faq_count: settings.faq_count ?? 5,
    faq_answer_length: settings.faq_answer_length ?? 100,
  };

  // Build prompt
  const systemPrompt = loadArticleGenerationPrompt();
  const prompt = buildArticlePrompt({
    organization,
    topic,
    keywords,
    scrapedContent,
    settings: articleSettings,
  });

  // Calculate maxTokens based on article requirements
  // Estimate: 1 word ≈ 3-4 tokens (accounting for JSON structure, markdown formatting, etc.)
  const estimatedTokensForContent = articleSettings.min_article_length * 3;
  const estimatedTokensForFAQ = articleSettings.faq_count * articleSettings.faq_answer_length * 3;
  const estimatedTokensForMetadata = 3000; // JSON structure, tags, etc.
  const bufferMultiplier = 2.0;
  
  const totalEstimatedTokens = estimatedTokensForContent + estimatedTokensForFAQ + estimatedTokensForMetadata;
  const maxTokens = Math.min(Math.ceil(totalEstimatedTokens * bufferMultiplier), 8192);

  let blogContent: BlogContent;
  let jsonResponse: string | undefined;

  try {
    // Generate article using AI
    jsonResponse = await generateTextWithAI({
      prompt,
      systemPrompt,
      temperature: 0.7,
      maxTokens,
    });

    if (!jsonResponse || jsonResponse.trim().length === 0) {
      throw new Error('AI returned empty response for article generation');
    }

    // Parse BlogContent from response
    blogContent = parseBlogContent(jsonResponse, organization.name, organization.domain_url);
  } catch (error) {
    console.warn('⚠️ Article generation/parsing failed');
    console.warn(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new Error(
      `Article generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Clean content field - remove any FAQ section that might have been included
  let cleanedContent = blogContent.content;
  const faqPatterns = [
    /\n\n##\s*FAQs?\s*$/i,
    /\n\n##\s*Frequently\s+Asked\s+Questions?\s*$/i,
    /\n\n##\s*FAQs?\s*\n.*$/is,
    /\n\n##\s*Frequently\s+Asked\s+Questions?\s*\n.*$/is,
  ];
  
  for (const pattern of faqPatterns) {
    cleanedContent = cleanedContent.replace(pattern, '');
  }
  
  cleanedContent = cleanedContent.replace(/\n\n\*\*Q:\*\*.*$/is, '');
  cleanedContent = cleanedContent.replace(/\n\nQ:\s*.*$/is, '');
  cleanedContent = cleanedContent.trim();
  
  blogContent.content = cleanedContent;

  // Convert BlogContent to markdown
  const markdownContent = blogContentToMarkdown(blogContent);

  // Count words (from markdown content)
  const wordCount = countWords(markdownContent);

  return {
    blogContent,
    markdown: markdownContent,
    wordCount,
  };
}

/**
 * Load the article generation prompt from finetune file
 */
function loadArticleGenerationPrompt(): string {
  try {
    const promptPath = join(process.cwd(), 'public/finetune/article-generation-dx.md');
    return readFileSync(promptPath, 'utf-8');
  } catch (error) {
    // Fallback to inline prompt if file not found
    return `You are a specialized content generation AI that produces **SEO/AEO/GEO-optimized articles**. Follow these strict guidelines for every response:

1. **Markdown Structure**: Format all output as **markdown** content. Start with an # H1 title that directly incorporates the user's query. Immediately after the H1, provide a concise **direct answer snippet** (<50 words) prefaced by **"Tl;Dr:"** in **bold**, answering the query directly (for AEO). Use ## H2 headings for sections with descriptive, **passage-based titles** (e.g., phrased as questions or statements containing key terms). Use ### H3 for any subsections if needed. Write clear, coherent paragraphs under each heading. Utilize ordered (numbered) or unordered lists (- or *) for steps, tips, or lists of items where appropriate. Emphasize important points with **bold** or *italic* where relevant.

2. **Content Depth and Richness**: The article should be **comprehensive and detailed**, covering all relevant aspects of the topic. Incorporate **latent semantic indexing (LSI) keywords** and **related entities** naturally throughout the text to improve semantic richness (e.g., synonyms, related concepts). Ensure information is accurate and **up-to-date**. Include **factual details, data, or statistics** to add credibility and value (and cite sources for these).

3. **Tables and Info Gain**: Include **comparison tables** or data tables to provide unique information gain. Use markdown table syntax (| Column | Column |). Ensure tables are directly relevant and add insights beyond what is already in the text. Use table captions or heading rows to explain what is being compared if needed.

4. **Key Takeaways Box**: Provide a "**Key Takeaways**" section as a **call-out box** using a blockquote (>). Inside, list the most important points or conclusions (ideally 3-5 bullet points or numbered points summarizing the article's top insights). This section should enable quick understanding of the article's main points and be clearly marked (e.g., start with a bold "Key Takeaways:" label inside the blockquote).

5. **Verdict/Summary**: If appropriate, include a final **"Verdict" or "Summary" table** to conclude comparisons or recommendations. This table should succinctly summarize key findings or compare options (for example, final recommendations of products with their rating, price, etc., or a summary of pros and cons). Use a brief leading caption or heading to introduce this table (e.g., an ## H2 titled "Summary" or "Final Verdict").

6. **FAQ Section**: Generate FAQs as a separate data structure. The FAQ questions and answers should be provided in the \`faq\` array field of the JSON response. **DO NOT include FAQ content in the main article \`content\` field.** The \`content\` field should contain only the article body (introduction, main content, conclusion). FAQs will be rendered separately from the frontmatter.

7. **Tone and Style**: Adopt an authoritative, professional tone with an engaging flow. The writing should demonstrate **E-E-A-T** (Experience, Expertise, Authoritativeness, Trustworthiness). Avoid fluff or filler content; every sentence should add value. Vary sentence structures (to add "burstiness" and maintain reader interest) while staying clear and informative. Speak as an expert to an intelligent reader. Define any important jargon on first use. Maintain an unbiased, informative stance (especially for product comparisons, highlight both pros and cons objectively).

8. **SEO Considerations**: The content should be naturally optimized for SEO without keyword stuffing. Use the exact query (or a close variant) in the title and within the first paragraph. Use related keywords in headings and body where relevant. Ensure each ## H2 covers a distinct subtopic (to align with potential **passage indexing** by search engines). Where possible, incorporate **structured data cues** (like Q&A pairs for FAQ schema, clear lists, etc.) to help search engines.

9. **Citing Sources**: **Back up factual claims with citations from authoritative sources.** Whenever you provide a statistic, quote, or specific fact, include a citation. Use only **high-authority, trusted websites** (e.g., reputable news outlets, academic or industry reports, official sites) as sources. Format citations as brief **inline references** in brackets, e.g. **【source†Lxx-Lyy】**, that refer to an external source. Place the citation right after the claim or fact. *Do NOT cite unreliable sources or make uncited claims that are not common knowledge.* Ensure all cited facts are verifiable.

10. **GEO (Generative Engine Optimization)**: Structure and content should be crafted such that other AI or answer engines can easily extract valuable information. This means using **clear lists, concise direct answers, and well-structured tables** that encapsulate key facts. Aim to provide **"information gain"** — include insights or data not commonly found in every article on the topic, making the content uniquely valuable. Content should be original (not plagiarized) but can incorporate facts from sources with proper citation.

**OUTPUT FORMAT**: You MUST return a valid JSON object matching this TypeScript type exactly:

\`\`\`typescript
export type BlogContent = {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  updatedAt: string;
  author: {
    name: string;
    url: string;
  };
  tags: string[];
  ogImage?: string;
  faq: {
    question: string;
    answer: string;
  }[];
  content: string;
};
\`\`\`

The \`content\` field should contain ONLY the article body markdown (introduction, main content, conclusion). **DO NOT include FAQ section in the \`content\` field.** FAQs should be provided separately in the \`faq\` array. The \`title\`, \`description\`, \`slug\`, \`publishedAt\`, \`updatedAt\`, \`author\`, \`tags\`, and \`faq\` fields will be used to generate the frontmatter. Return ONLY valid JSON, no markdown code blocks or additional text.`;
  }
}

/**
 * Build the article generation prompt
 */
function buildArticlePrompt(context: {
  organization: Organization;
  topic: Topic;
  keywords: string[];
  scrapedContent: string;
  settings: Required<ArticleSettings>;
}): string {
  const { organization, topic, keywords, scrapedContent, settings } = context;
  const now = new Date();
  const publishedAt = now.toISOString().split('T')[0];
  const authorUrl = `${organization.domain_url}/about`;

  return `Generate a comprehensive, SEO/AEO/GEO-optimized article for the following topic:

Topic Title: ${topic.topic_name}
Topic Summary: ${topic.summary ?? 'Not provided'}

Business Context:
- Name: ${organization.name}
- Industry: ${organization.industry ?? 'Not specified'}
- Description: ${organization.description ?? 'Not provided'}
- Target Audience: ${organization.target_audience_description ?? 'Not specified'}
- Domain URL: ${organization.domain_url}

${scrapedContent ? `Website Content Context:\n${scrapedContent.substring(0, 2000)}\n` : ''}

Relevant Keywords (use naturally throughout):
${keywords.slice(0, 50).join(', ')}

Content Requirements (STRICT - MUST BE FOLLOWED):
- Minimum word count for article content: ${settings.min_article_length} words (this is the MAIN article body, excluding FAQ section)
- FAQ section: EXACTLY ${settings.faq_count} questions (no more, no less)
- Each FAQ answer: AT LEAST ${settings.faq_answer_length} words per answer (each answer must meet this minimum)
- Include tables, key takeaways, and structured content as per guidelines
- Optimize for SEO, AEO, and GEO

CRITICAL REQUIREMENTS:
1. The article content (main body) must be at least ${settings.min_article_length} words
2. The FAQ section is SEPARATE - FAQs go in the \`faq\` array, NOT in the \`content\` field
3. The \`content\` field should contain ONLY the article body (introduction, main content, conclusion)
4. DO NOT include "## FAQs" or any FAQ section in the \`content\` field
5. The \`faq\` array must contain EXACTLY ${settings.faq_count} items, each with a question and an answer of at least ${settings.faq_answer_length} words

Metadata Requirements:
- Use the topic title as the article title
- Generate a compelling description (150-200 characters)
- Use slug: "${topic.slug}"
- Set publishedAt: "${publishedAt}"
- Set updatedAt: "${publishedAt}"
- Set author name: "${organization.name}"
- Set author url: "${authorUrl}"
- Extract relevant tags from the keywords provided (5-10 tags)
- FAQ array must contain EXACTLY ${settings.faq_count} items, each with a question and an answer of at least ${settings.faq_answer_length} words

Return a valid JSON object matching the BlogContent type as specified in the system prompt. 
IMPORTANT: The \`content\` field should contain ONLY the article body markdown (no FAQ section). The FAQ section goes in the separate \`faq\` array field.`;
}

/**
 * Parse BlogContent from AI JSON response
 * Includes robust error handling and attempts to recover from malformed JSON
 */
function parseBlogContent(
  jsonResponse: string,
  organizationName: string = 'Unknown',
  organizationUrl: string = 'https://example.com'
): BlogContent {
  try {
    // Remove markdown code blocks if present
    let cleaned = jsonResponse.trim();
    
    // Handle markdown code blocks
    cleaned = cleaned.replace(/^```[a-z]*\n?/i, '');
    cleaned = cleaned.replace(/\n?```\s*$/m, '');
    cleaned = cleaned.trim();
    
    // Extract JSON object - find the first { and try to match it with the last }
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace === -1) {
      throw new Error('No JSON object found in response');
    }
    
    cleaned = cleaned.substring(firstBrace);
    
    // Find the matching closing brace by counting braces
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;
    let lastValidIndex = -1;
    
    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0 && bracketCount === 0) {
            lastValidIndex = i;
            break;
          }
        } else if (char === '[') {
          bracketCount++;
        } else if (char === ']') {
          bracketCount--;
        }
      }
    }
    
    // If we found a complete JSON object, use it
    if (lastValidIndex > 0) {
      cleaned = cleaned.substring(0, lastValidIndex + 1);
    } else {
      // JSON is incomplete - try to close it
      if (braceCount > 0) {
        cleaned += '}'.repeat(braceCount);
      }
      if (bracketCount > 0) {
        cleaned += ']'.repeat(bracketCount);
      }
    }

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
      `The response may be incomplete or malformed. Consider increasing maxTokens if the article content is very long.`
    );
  }
}

